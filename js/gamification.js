/**
 * StudyOS v5 - Gamification Engine
 * Implements XP accumulation math, Level dynamic calculations,
 * streak tracking, and automatic achievement evaluations.
 */

import { putRecord, getAll, getByKey } from './db.js';

export const ACHIEVEMENTS_DEF = [
  { id: 'first_session', title: 'First Step', desc: 'Completed your first study session (≥ 60s)', icon: '🌱' },
  { id: 'hours_10', title: 'Focused Mind', desc: 'Accumulated 10 hours of total study time', icon: '📖' },
  { id: 'hours_50', title: 'Scholar', desc: 'Accumulated 50 hours of total study time', icon: '🧠' },
  { id: 'hours_100', title: 'Master of Knowledge', desc: 'Accumulated 100 hours of total study time', icon: '🎓' },
  { id: 'streak_7', title: 'Unstoppable Momentum', desc: 'Maintained a 7-day study goal streak', icon: '🔥' },
  { id: 'streak_30', title: 'Habitual Greatness', desc: 'Maintained a 30-day study goal streak', icon: '⚡' },
  { id: 'task_master', title: 'Task Master', desc: 'Completed 50 total tasks', icon: '✅' },
  { id: 'consistency_champion', title: 'Consistency Champion', desc: 'Logged activity on 14 consecutive days', icon: '🏆' }
];

/**
 * §15 Level Formula:
 * XP required for level n = round(100 × n^1.5, nearest 10)
 */
export function getXPForLevel(n) {
  if (n <= 1) return 0;
  const raw = 100 * Math.pow(n, 1.5);
  return Math.round(raw / 10) * 10;
}

export function getLevelData(totalXP) {
  let level = 1;
  while (totalXP >= getXPForLevel(level + 1)) {
    level++;
  }

  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const xpInCurrentLevel = totalXP - currentLevelXP;
  const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
  const progressPct = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100)));

  return {
    level,
    totalXP,
    currentLevelXP,
    nextLevelXP,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressPct
  };
}

/**
 * Calculates XP earned for various user actions
 */
export function calculateXPEarned(actionType, meta = {}) {
  switch (actionType) {
    case 'STUDY_SESSION': {
      // 10 XP + 1 XP per 5 min
      const durationMins = Math.floor((meta.durationSeconds || 0) / 60);
      const bonusPer5Min = Math.floor(durationMins / 5);
      return 10 + bonusPer5Min;
    }
    case 'TASK_COMPLETED': {
      // 5 XP for Study, 3 XP for others
      return meta.category === 'Study' ? 5 : 3;
    }
    case 'DAILY_STUDY_GOAL_HIT':
      return 20;
    case 'DAILY_TASK_GOAL_HIT':
      return 15;
    case 'STREAK_BONUS': {
      // 5 XP * streak count, capped at 50 XP/day
      const streakDays = meta.streakDays || 1;
      return Math.min(50, 5 * streakDays);
    }
    case 'HABIT_COMPLETED':
      return 5;
    default:
      return 0;
  }
}

/**
 * Adds XP to user profile and logs XP event in history
 */
export async function awardXP(actionType, meta = {}) {
  const amount = calculateXPEarned(actionType, meta);
  if (amount <= 0) return 0;

  let profile = (await getByKey('profile', 'user_profile')) || { id: 'user_profile', totalXP: 0 };
  const oldXP = profile.totalXP || 0;
  const newXP = oldXP + amount;
  profile.totalXP = newXP;
  await putRecord('profile', profile);

  // Log to xp_history
  const xpRecord = {
    id: 'xp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: Date.now(),
    amount,
    source: actionType,
    details: meta.details || '',
    schemaVersion: 1
  };
  await putRecord('xp_history', xpRecord);

  // Check level up event
  const oldLevel = getLevelData(oldXP).level;
  const newLevel = getLevelData(newXP).level;

  return {
    amount,
    newTotalXP: newXP,
    leveledUp: newLevel > oldLevel,
    newLevel
  };
}

/**
 * Evaluates and unlocks achievements automatically
 */
export async function checkAchievements() {
  const existingUnlocked = await getAll('achievements');
  const unlockedMap = new Map(existingUnlocked.map(a => [a.id, a]));

  const sessions = await getAll('sessions');
  const tasks = await getAll('tasks');
  const completedTasks = tasks.filter(t => t.completed);
  const calendarDays = await getAll('calendar_days');

  const totalStudySeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const totalStudyHours = totalStudySeconds / 3600;

  // Calculate current streak
  let currentStreak = 0;
  const sortedDays = calendarDays.sort((a, b) => b.date.localeCompare(a.date));
  for (const day of sortedDays) {
    if (day.status === 'GREEN' || day.status === 'REST') {
      currentStreak++;
    } else if (day.status === 'RED') {
      break;
    }
  }

  const newlyUnlocked = [];

  for (const def of ACHIEVEMENTS_DEF) {
    const isUnlocked = unlockedMap.get(def.id)?.unlocked;
    if (isUnlocked) continue;

    let conditionMet = false;
    switch (def.id) {
      case 'first_session':
        conditionMet = sessions.length >= 1;
        break;
      case 'hours_10':
        conditionMet = totalStudyHours >= 10;
        break;
      case 'hours_50':
        conditionMet = totalStudyHours >= 50;
        break;
      case 'hours_100':
        conditionMet = totalStudyHours >= 100;
        break;
      case 'streak_7':
        conditionMet = currentStreak >= 7;
        break;
      case 'streak_30':
        conditionMet = currentStreak >= 30;
        break;
      case 'task_master':
        conditionMet = completedTasks.length >= 50;
        break;
      case 'consistency_champion':
        conditionMet = currentStreak >= 14;
        break;
    }

    if (conditionMet) {
      const record = {
        id: def.id,
        unlocked: true,
        unlockedTimestamp: Date.now(),
        progress: 100,
        schemaVersion: 1
      };
      await putRecord('achievements', record);
      newlyUnlocked.push({ ...def, ...record });
    }
  }

  return newlyUnlocked;
}
