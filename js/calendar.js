/**
 * StudyOS v5 - Daily Performance Calendar Engine
 * Evaluates daily productivity status using strict order-of-precedence rules,
 * enforces 2-per-week Rest Day cap, and computes streak metrics.
 */

import { getAll, getByKey, putRecord } from './db.js';

export const CALENDAR_STATUS = {
  REST: 'REST',
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  ORANGE: 'ORANGE',
  RED: 'RED',
  GRAY: 'GRAY'
};

/**
 * Gets ISO date string "YYYY-MM-DD" for given date object or timestamp
 */
export function toISODateString(dateInput = new Date()) {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates start (Monday) and end (Sunday) ISO date strings of the calendar week containing dateStr
 */
export function getWeekRange(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = d.getDay(); // 0 (Sun) - 6 (Sat)
  const distanceToMon = (dayOfWeek + 6) % 7;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() - distanceToMon);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    start: toISODateString(monday),
    end: toISODateString(sunday)
  };
}

/**
 * Checks how many Rest Days have been logged in the week containing dateStr
 */
export async function getRestDaysCountInWeek(dateStr) {
  const { start, end } = getWeekRange(dateStr);
  const calendarDays = await getAll('calendar_days');
  
  return calendarDays.filter(day => {
    return day.date >= start && day.date <= end && (day.status === CALENDAR_STATUS.REST || day.isRestDay);
  }).length;
}

/**
 * Toggles or requests Rest Day status for dateStr, enforcing §17 Rest Day cap of 2 per week.
 */
export async function toggleRestDay(dateStr) {
  const existingRecord = await getByKey('calendar_days', dateStr) || { date: dateStr, schemaVersion: 1 };
  
  // If already rest day, un-mark it
  if (existingRecord.status === CALENDAR_STATUS.REST || existingRecord.isRestDay) {
    existingRecord.isRestDay = false;
    existingRecord.status = CALENDAR_STATUS.GRAY;
    await evaluateDayStatus(dateStr, existingRecord);
    return { success: true, isRest: false };
  }

  // Check 2 per week cap
  const countInWeek = await getRestDaysCountInWeek(dateStr);
  if (countInWeek >= 2) {
    return {
      success: false,
      isRest: false,
      error: 'Rest Day limit reached! Maximum 2 Rest Days are permitted per calendar week.'
    };
  }

  existingRecord.isRestDay = true;
  existingRecord.status = CALENDAR_STATUS.REST;
  await putRecord('calendar_days', existingRecord);
  return { success: true, isRest: true };
}

/**
 * Main evaluation pipeline for a day's performance rating (§17)
 */
export async function evaluateDayStatus(dateStr, existingRecord = null) {
  const record = existingRecord || (await getByKey('calendar_days', dateStr)) || { date: dateStr, schemaVersion: 1 };
  
  // Rule 1: Rest Day -> Gray (Preserves streak, capped at 2/week)
  if (record.isRestDay || record.status === CALENDAR_STATUS.REST) {
    record.status = CALENDAR_STATUS.REST;
    await putRecord('calendar_days', record);
    return record.status;
  }

  // Gather day metrics
  const settings = (await getByKey('settings', 'app_settings')) || { dailyStudyGoalMinutes: 30 };
  const dailyStudyGoalMins = settings.dailyStudyGoalMinutes || 0;

  const sessions = await getAll('sessions');
  const daySessions = sessions.filter(s => {
    const sDate = toISODateString(s.startTimestamp);
    return sDate === dateStr && (s.durationSeconds >= 60);
  });
  const totalStudySeconds = daySessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalStudyMinutes = Math.floor(totalStudySeconds / 60);

  const tasks = await getAll('tasks');
  const dayTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    return t.dueDate === dateStr;
  });

  const totalTasks = dayTasks.length;
  const completedTasks = dayTasks.filter(t => t.completed).length;
  const missedTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) : 1;

  record.studyMinutes = totalStudyMinutes;
  record.tasksCompleted = completedTasks;
  record.tasksScheduled = totalTasks;

  const hasScheduledTasks = totalTasks > 0;
  const hasStudyGoal = dailyStudyGoalMins > 0;

  // Rule 2: Unscheduled activity logged (0 scheduled tasks/goal, but logged session >=60s or task)
  if (!hasScheduledTasks && !hasStudyGoal && (totalStudyMinutes > 0 || completedTasks > 0)) {
    record.status = CALENDAR_STATUS.GREEN;
    await putRecord('calendar_days', record);
    return record.status;
  }

  // Rule 7 check first if nothing scheduled and no activity
  if (!hasScheduledTasks && !hasStudyGoal && totalStudyMinutes === 0 && completedTasks === 0) {
    record.status = CALENDAR_STATUS.GRAY;
    await putRecord('calendar_days', record);
    return record.status;
  }

  // Rule 3: RED -> >3 tasks missed OR <50% completion OR active study goal with 0 mins logged
  const isStudyGoalFailed = hasStudyGoal && totalStudyMinutes === 0;
  if (missedTasks > 3 || (hasScheduledTasks && completionRate < 0.5) || isStudyGoalFailed) {
    record.status = CALENDAR_STATUS.RED;
    await putRecord('calendar_days', record);
    return record.status;
  }

  // Rule 4: GREEN -> 100% completion AND study goal met (if active)
  const isStudyGoalMet = !hasStudyGoal || totalStudyMinutes >= dailyStudyGoalMins;
  if (completionRate === 1.0 && isStudyGoalMet) {
    record.status = CALENDAR_STATUS.GREEN;
    await putRecord('calendar_days', record);
    return record.status;
  }

  // Rule 5: YELLOW -> 80-99% completion
  if (completionRate >= 0.8 && completionRate < 1.0) {
    record.status = CALENDAR_STATUS.YELLOW;
    await putRecord('calendar_days', record);
    return record.status;
  }

  // Rule 6: ORANGE -> 50-79% completion
  if (completionRate >= 0.5 && completionRate < 0.8) {
    record.status = CALENDAR_STATUS.ORANGE;
    await putRecord('calendar_days', record);
    return record.status;
  }

  // Default Fallback
  record.status = CALENDAR_STATUS.GRAY;
  await putRecord('calendar_days', record);
  return record.status;
}

/**
 * Calculates current rolling streak (§26)
 */
export async function calculateStreak() {
  const calendarDays = await getAll('calendar_days');
  const dayMap = new Map(calendarDays.map(d => [d.date, d]));

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Evaluate backward from today
  const today = new Date();
  let checkDate = new Date(today);

  // Check today first. If today isn't finalized/Red yet, streak retains up to yesterday
  const todayStr = toISODateString(today);
  const todayRecord = dayMap.get(todayStr);

  if (todayRecord) {
    if (todayRecord.status === CALENDAR_STATUS.GREEN || todayRecord.status === CALENDAR_STATUS.REST) {
      currentStreak++;
    } else if (todayRecord.status === CALENDAR_STATUS.RED) {
      // Red day breaks streak immediately!
      return { currentStreak: 0, longestStreak: await getLongestStreak(calendarDays) };
    }
  }

  // Move back day by day
  checkDate.setDate(checkDate.getDate() - 1);

  while (true) {
    const dateStr = toISODateString(checkDate);
    const rec = dayMap.get(dateStr);

    if (!rec) {
      // No record logged for past day, stop streak loop
      break;
    }

    if (rec.status === CALENDAR_STATUS.GREEN || rec.status === CALENDAR_STATUS.REST) {
      currentStreak++;
    } else if (rec.status === CALENDAR_STATUS.RED) {
      // Red breaks streak
      break;
    } else {
      // Gray / Yellow / Orange: streak pauses or breaks depending on goal
      break;
    }

    checkDate.setDate(checkDate.getDate() - 1);
  }

  const longest = Math.max(currentStreak, await getLongestStreak(calendarDays));
  return { currentStreak, longestStreak: longest };
}

async function getLongestStreak(calendarDays) {
  let profile = await getByKey('profile', 'user_profile');
  return profile?.longestStreak || 0;
}
