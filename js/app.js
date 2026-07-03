/**
 * Personal Study OS - Main Application Bundle
 * Merged into a single-file scripts to support direct local double-clicking
 * of index.html by avoiding browser CORS origin blocks.
 */

// =========================================================================
// 1. DATABASE COMPONENT (Formerly db.js)
// =========================================================================

const DB_NAME = 'PersonalStudyOSDB';
const DB_VERSION = 1;
let dbInstance = null;

function initDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => {
      console.error('IndexedDB open error:', e.target.error);
      reject(e.target.error);
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (e) => {
      const dbObj = e.target.result;

      if (!dbObj.objectStoreNames.contains('sessions')) {
        const sessionStore = dbObj.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        sessionStore.createIndex('date', 'date', { unique: false });
        sessionStore.createIndex('subjectId', 'subjectId', { unique: false });
      }

      if (!dbObj.objectStoreNames.contains('tasks')) {
        const taskStore = dbObj.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
        taskStore.createIndex('dueDate', 'dueDate', { unique: false });
        taskStore.createIndex('completedDate', 'completedDate', { unique: false });
        taskStore.createIndex('category', 'category', { unique: false });
        taskStore.createIndex('isRecurring', 'isRecurring', { unique: false });
      }

      if (!dbObj.objectStoreNames.contains('xpLogs')) {
        const xpStore = dbObj.createObjectStore('xpLogs', { keyPath: 'id', autoIncrement: true });
        xpStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!dbObj.objectStoreNames.contains('achievements')) {
        dbObj.createObjectStore('achievements', { keyPath: 'id' });
      }

      if (!dbObj.objectStoreNames.contains('reminders')) {
        dbObj.createObjectStore('reminders', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getStore(storeName, mode = 'readonly') {
  const transaction = dbInstance.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

function addSession(session) {
  return new Promise((resolve, reject) => {
    const store = getStore('sessions', 'readwrite');
    const request = store.add(session);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllSessions() {
  return new Promise((resolve, reject) => {
    const store = getStore('sessions');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function addTask(task) {
  return new Promise((resolve, reject) => {
    const store = getStore('tasks', 'readwrite');
    const request = store.add(task);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function updateTask(task) {
  return new Promise((resolve, reject) => {
    const store = getStore('tasks', 'readwrite');
    const request = store.put(task);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteTask(taskId) {
  return new Promise((resolve, reject) => {
    const store = getStore('tasks', 'readwrite');
    const request = store.delete(taskId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllTasks() {
  return new Promise((resolve, reject) => {
    const store = getStore('tasks');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function addXPLog(log) {
  return new Promise((resolve, reject) => {
    const store = getStore('xpLogs', 'readwrite');
    const request = store.add(log);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllXPLogs() {
  return new Promise((resolve, reject) => {
    const store = getStore('xpLogs');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveAchievement(achievement) {
  return new Promise((resolve, reject) => {
    const store = getStore('achievements', 'readwrite');
    const request = store.put(achievement);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllAchievements() {
  return new Promise((resolve, reject) => {
    const store = getStore('achievements');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function addReminder(reminder) {
  return new Promise((resolve, reject) => {
    const store = getStore('reminders', 'readwrite');
    const request = store.add(reminder);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function updateReminder(reminder) {
  return new Promise((resolve, reject) => {
    const store = getStore('reminders', 'readwrite');
    const request = store.put(reminder);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteReminder(reminderId) {
  return new Promise((resolve, reject) => {
    const store = getStore('reminders', 'readwrite');
    const request = store.delete(reminderId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllReminders() {
  return new Promise((resolve, reject) => {
    const store = getStore('reminders');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function wipeDatabase() {
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(
      ['sessions', 'tasks', 'xpLogs', 'achievements', 'reminders'],
      'readwrite'
    );
    
    transaction.objectStore('sessions').clear();
    transaction.objectStore('tasks').clear();
    transaction.objectStore('xpLogs').clear();
    transaction.objectStore('achievements').clear();
    transaction.objectStore('reminders').clear();

    transaction.oncomplete = () => {
      localStorage.clear();
      resolve(true);
    };
    
    transaction.onerror = (e) => {
      console.error('Wipe db error:', e.target.error);
      reject(e.target.error);
    };
  });
}

async function getBackupData() {
  const sessions = await getAllSessions();
  const tasks = await getAllTasks();
  const xpLogs = await getAllXPLogs();
  const achievements = await getAllAchievements();
  const reminders = await getAllReminders();
  
  const localStorageData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    localStorageData[key] = localStorage.getItem(key);
  }

  return {
    sessions,
    tasks,
    xpLogs,
    achievements,
    reminders,
    localStorage: localStorageData,
    version: DB_VERSION,
    timestamp: new Date().toISOString()
  };
}

async function restoreBackupData(data) {
  await wipeDatabase();

  if (data.localStorage) {
    Object.entries(data.localStorage).forEach(([key, val]) => {
      localStorage.setItem(key, val);
    });
  }

  const restoreList = async (storeName, items) => {
    if (!items || !items.length) return;
    const store = getStore(storeName, 'readwrite');
    for (const item of items) {
      await new Promise((resolve, reject) => {
        const req = store.add(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  };

  await restoreList('sessions', data.sessions);
  await restoreList('tasks', data.tasks);
  await restoreList('xpLogs', data.xpLogs);
  await restoreList('achievements', data.achievements);
  await restoreList('reminders', data.reminders);

  return true;
}

// Database Namespace Object
const db = {
  initDB,
  addSession,
  getAllSessions,
  addTask,
  updateTask,
  deleteTask,
  getAllTasks,
  addXPLog,
  getAllXPLogs,
  saveAchievement,
  getAllAchievements,
  addReminder,
  updateReminder,
  deleteReminder,
  getAllReminders,
  wipeDatabase,
  getBackupData,
  restoreBackupData
};

// =========================================================================
// 2. GAMIFICATION COMPONENT (Formerly gamification.js)
// =========================================================================

const XP_VALUES = {
  COMPLETE_TASK: 20,
  COMPLETE_GROWTH: 15,
  STUDY_MINUTE: 1,
  GREEN_DAY: 100
};

function calculateLevel(xp) {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * 100;
}

function xpNeededForNextLevel(level) {
  return xpForLevel(level + 1) - xpForLevel(level);
}

async function addXP(amount, source) {
  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
  if (!profile.username) return null;

  const oldXP = profile.xp || 0;
  const newXP = oldXP + amount;
  const oldLevel = calculateLevel(oldXP);
  const newLevel = calculateLevel(newXP);

  profile.xp = newXP;
  profile.level = newLevel;
  localStorage.setItem('personal_study_os_profile', JSON.stringify(profile));

  await db.addXPLog({
    amount,
    source,
    timestamp: new Date().toISOString()
  });

  let leveledUp = false;
  if (newLevel > oldLevel) {
    leveledUp = true;
    console.log(`Leveled Up! Level ${newLevel}`);
  }

  const unlockedBadges = await checkAchievements();

  return {
    xp: newXP,
    level: newLevel,
    leveledUp,
    unlockedBadges
  };
}

async function calculateStreaks() {
  const sessions = await db.getAllSessions();
  const tasksList = await db.getAllTasks();

  const activityDates = new Set();

  sessions.forEach(s => {
    if (s.date) activityDates.add(s.date.split('T')[0]);
  });

  tasksList.forEach(t => {
    if (t.completed && t.completedDate) {
      activityDates.add(t.completedDate.split('T')[0]);
    }
  });

  const sortedDates = Array.from(activityDates).sort();
  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const dateMap = {};
  sortedDates.forEach(d => { dateMap[d] = true; });

  if (sortedDates.length > 0) {
    let prevDate = null;
    sortedDates.forEach(dateStr => {
      const currentDate = new Date(dateStr);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffTime = Math.abs(currentDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          tempStreak = 1;
        }
      }
      prevDate = currentDate;
    });
    if (tempStreak > longestStreak) longestStreak = tempStreak;
  }

  if (dateMap[todayStr] || dateMap[yesterdayStr]) {
    let checkDate = dateMap[todayStr] ? new Date(todayStr) : new Date(yesterdayStr);
    while (true) {
      const checkStr = checkDate.toISOString().split('T')[0];
      if (dateMap[checkStr]) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  } else {
    currentStreak = 0;
  }

  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
  if (profile.username) {
    profile.currentStreak = currentStreak;
    profile.longestStreak = Math.max(longestStreak, profile.longestStreak || 0);
    localStorage.setItem('personal_study_os_profile', JSON.stringify(profile));
  }

  return { currentStreak, longestStreak };
}

async function getDayPerformance(dateStr) {
  const sessions = await db.getAllSessions();
  const tasksList = await db.getAllTasks();

  const daySessions = sessions.filter(s => s.date && s.date.startsWith(dateStr));
  const dayTasks = tasksList.filter(t => t.dueDate === dateStr);

  const totalStudyTime = daySessions.reduce((acc, s) => acc + (s.duration || 0), 0);
  const totalTasks = dayTasks.length;
  const completedTasks = dayTasks.filter(t => t.completed).length;

  if (totalTasks === 0 && totalStudyTime === 0) {
    return { rating: 'empty', completed: 0, total: 0, missed: 0, studyTime: 0 };
  }

  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const missedTasks = totalTasks - completedTasks;

  let rating = 'empty';

  if (totalTasks > 0) {
    if (completionRate === 1.0) {
      rating = 'green';
    } else if (completionRate >= 0.8) {
      rating = 'yellow';
    } else if (completionRate >= 0.5) {
      rating = 'orange';
    } else {
      rating = 'red';
    }

    if (missedTasks > 3 || completionRate < 0.5 || totalStudyTime === 0) {
      rating = 'red';
    }
  } else {
    if (totalStudyTime > 0) {
      rating = 'green';
    }
  }

  return {
    rating,
    completed: completedTasks,
    total: totalTasks,
    missed: missedTasks,
    studyTime: totalStudyTime
  };
}

async function getMonthStatistics(year, month) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  
  let greenCount = 0;
  let yellowCount = 0;
  let orangeCount = 0;
  let redCount = 0;
  let activeDays = 0;
  let totalCompletions = 0;
  let totalTasksCount = 0;

  for (let d = 1; d <= endDate.getDate(); d++) {
    const checkDate = new Date(year, month, d);
    const offset = checkDate.getTimezoneOffset();
    const localDate = new Date(checkDate.getTime() - (offset * 60 * 1000));
    const dateStr = localDate.toISOString().split('T')[0];

    const stats = await getDayPerformance(dateStr);
    totalCompletions += stats.completed;
    totalTasksCount += stats.total;

    if (stats.rating !== 'empty') {
      activeDays++;
      if (stats.rating === 'green') greenCount++;
      else if (stats.rating === 'yellow') yellowCount++;
      else if (stats.rating === 'orange') orangeCount++;
      else if (stats.rating === 'red') redCount++;
    }
  }

  const { currentStreak, longestStreak } = await calculateStreaks();
  const completionRate = totalTasksCount > 0 ? Math.round((totalCompletions / totalTasksCount) * 100) : 0;

  return {
    green: greenCount,
    yellow: yellowCount,
    orange: orangeCount,
    red: redCount,
    currentStreak,
    longestStreak,
    completionRate
  };
}

async function checkAchievements() {
  const sessions = await db.getAllSessions();
  const tasksList = await db.getAllTasks();
  const achievements = await db.getAllAchievements();
  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');

  const achMap = {};
  achievements.forEach(a => { achMap[a.id] = a; });

  const totalStudyMinutes = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);
  const totalStudyHours = totalStudyMinutes / 60;
  const totalCompletedTasks = tasksList.filter(t => t.completed).length;

  const streakStats = await calculateStreaks();
  const longestStreak = streakStats.longestStreak;

  let greenDays = 0;
  const datesCheck = new Set();
  sessions.forEach(s => { if(s.date) datesCheck.add(s.date.split('T')[0]); });
  tasksList.forEach(t => { if(t.completedDate) datesCheck.add(t.completedDate.split('T')[0]); });

  for (const dateStr of datesCheck) {
    const perf = await getDayPerformance(dateStr);
    if (perf.rating === 'green') greenDays++;
  }

  const subjectsList = profile.subjects || [];

  const achievementsDefs = [
    { id: 'first_session', name: 'First Study Session', desc: 'Log your first study session', trigger: sessions.length >= 1 },
    { id: 'hours_10', name: '10 Hours Studied', desc: 'Log 10 total hours of study time', trigger: totalStudyHours >= 10 },
    { id: 'hours_50', name: '50 Hours Studied', desc: 'Log 50 total hours of study time', trigger: totalStudyHours >= 50 },
    { id: 'hours_100', name: '100 Hours Studied', desc: 'Log 100 total hours of study time', trigger: totalStudyHours >= 100 },
    { id: 'streak_7', name: '7-Day Streak', desc: 'Maintain a 7-day study or task completion streak', trigger: longestStreak >= 7 },
    { id: 'streak_30', name: '30-Day Streak', desc: 'Maintain a 30-day study or task completion streak', trigger: longestStreak >= 30 },
    { id: 'streak_365', name: '365-Day Streak', desc: 'Maintain a 365-day study or task completion streak', trigger: longestStreak >= 365 },
    { id: 'task_master', name: 'Task Master', desc: 'Complete 50 tasks total', trigger: totalCompletedTasks >= 50 },
    { id: 'consistency_champion', name: 'Consistency Champion', desc: 'Earn 10 Green Days on your calendar', trigger: greenDays >= 10 },
    { id: 'academic_sprout', name: 'Academic Sprout', desc: 'Create 5 different study subjects', trigger: subjectsList.length >= 5 },
    { id: 'focus_champion', name: 'Focus Champion', desc: 'Log a study session of at least 90 minutes', trigger: sessions.some(s => s.duration >= 90) }
  ];

  const newlyUnlocked = [];

  for (const def of achievementsDefs) {
    const existing = achMap[def.id];
    if (def.trigger && (!existing || !existing.unlocked)) {
      const unlockData = {
        id: def.id,
        name: def.name,
        desc: def.desc,
        unlocked: true,
        unlockDate: new Date().toISOString()
      };
      await db.saveAchievement(unlockData);
      newlyUnlocked.push(def.name);
      
      await addXP(50, `Unlocked Achievement: ${def.name}`);
    } else if (!existing) {
      await db.saveAchievement({
        id: def.id,
        name: def.name,
        desc: def.desc,
        unlocked: false,
        unlockDate: null
      });
    }
  }

  return newlyUnlocked;
}

// Gamification Namespace Object
const gamify = {
  calculateLevel,
  xpForLevel,
  xpNeededForNextLevel,
  XP_VALUES,
  addXP,
  calculateStreaks,
  getDayPerformance,
  getMonthStatistics,
  checkAchievements
};

// =========================================================================
// 3. TASKS & HABITS COMPONENT (Formerly tasks.js)
// =========================================================================

function addSubject(name, color) {
  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
  const subjects = profile.subjects || [];

  if (subjects.length >= 10) {
    throw new Error('Maximum limit of 10 subjects reached. Please delete or edit existing ones in settings.');
  }

  const newSub = {
    id: 'sub_' + Date.now(),
    name,
    color
  };

  subjects.push(newSub);
  profile.subjects = subjects;
  localStorage.setItem('personal_study_os_profile', JSON.stringify(profile));

  return newSub;
}

function editSubject(id, name, color) {
  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
  const subjects = profile.subjects || [];

  const index = subjects.findIndex(s => s.id === id);
  if (index !== -1) {
    subjects[index].name = name;
    subjects[index].color = color;
    profile.subjects = subjects;
    localStorage.setItem('personal_study_os_profile', JSON.stringify(profile));
  }
}

function deleteSubject(id) {
  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
  let subjects = profile.subjects || [];

  subjects = subjects.filter(s => s.id !== id);
  profile.subjects = subjects;
  localStorage.setItem('personal_study_os_profile', JSON.stringify(profile));
}

async function createTarget(taskData) {
  const task = {
    title: taskData.title,
    description: taskData.description || '',
    category: taskData.category || 'Study',
    estimatedDuration: parseInt(taskData.estimatedDuration) || 30,
    dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
    scope: taskData.scope || 'daily',
    completed: false,
    completedDate: null,
    isRecurring: false
  };

  const id = await db.addTask(task);
  return id;
}

async function toggleTaskCompletion(taskId, completed, uiCallbacks) {
  const tasksList = await db.getAllTasks();
  const task = tasksList.find(t => t.id === taskId);
  
  if (task) {
    task.completed = completed;
    task.completedDate = completed ? new Date().toISOString() : null;
    await db.updateTask(task);

    if (completed) {
      const isGrowthInstance = task.title.includes('[Recurring Growth Habit]');
      const xpVal = isGrowthInstance ? gamify.XP_VALUES.COMPLETE_GROWTH : gamify.XP_VALUES.COMPLETE_TASK;
      const xpResult = await gamify.addXP(xpVal, `Completed target: ${task.title}`);

      const todayStr = new Date().toISOString().split('T')[0];
      if (task.dueDate === todayStr) {
        const todayTasks = tasksList.filter(t => t.dueDate === todayStr && t.id !== taskId);
        const allOthersCompleted = todayTasks.every(t => t.completed);
        if (allOthersCompleted) {
          const freshTasks = await db.getAllTasks();
          const todayFresh = freshTasks.filter(t => t.dueDate === todayStr);
          const allCompleted = todayFresh.every(t => t.completed);
          if (allCompleted && todayFresh.length > 0) {
            await gamify.addXP(gamify.XP_VALUES.GREEN_DAY, `Green Day Bonus! 100% goals achieved.`);
            alert('🟢 Green Day achieved! You completed 100% of today\'s tasks. Awarded +100 XP!');
          }
        }
      }

      if (uiCallbacks && uiCallbacks.onXPChanged) {
        uiCallbacks.onXPChanged(xpResult);
      }
    }
  }
}

async function removeTask(taskId) {
  await db.deleteTask(taskId);
}

async function createGrowthHabit(habitData) {
  const habit = {
    title: habitData.title,
    category: habitData.category || 'Mental',
    estimatedDuration: parseInt(habitData.estimatedDuration) || 15,
    isRecurring: true,
    recurrenceType: habitData.recurrenceType || 'daily',
    recurrenceDays: habitData.recurrenceDays || [],
    completed: false
  };

  const id = await db.addTask(habit);
  return id;
}

async function instantiateRecurringHabits() {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - (offset * 60 * 1000));
  const todayStr = localToday.toISOString().split('T')[0];
  const todayDayOfWeek = today.getDay();

  const lastPopulatedDate = localStorage.getItem('last_recurring_population_date');
  if (lastPopulatedDate === todayStr) {
    return;
  }

  const allTasks = await db.getAllTasks();
  const growthHabits = allTasks.filter(t => t.isRecurring);

  let populatedAny = false;

  for (const habit of growthHabits) {
    let shouldInstantiate = false;

    if (habit.recurrenceType === 'daily') {
      shouldInstantiate = true;
    } else if (habit.recurrenceType === 'weekdays') {
      if (todayDayOfWeek >= 1 && todayDayOfWeek <= 5) {
        shouldInstantiate = true;
      }
    } else if (habit.recurrenceType === 'weekly') {
      if (todayDayOfWeek === 1) {
        shouldInstantiate = true;
      }
    } else if (habit.recurrenceType === 'specific') {
      const dayIndexStr = String(todayDayOfWeek);
      if (habit.recurrenceDays && habit.recurrenceDays.map(String).includes(dayIndexStr)) {
        shouldInstantiate = true;
      }
    }

    if (shouldInstantiate) {
      const alreadyExists = allTasks.some(
        t => t.dueDate === todayStr && 
        t.title === `[Recurring Growth Habit] ${habit.title}`
      );

      if (!alreadyExists) {
        const newDailyTarget = {
          title: `[Recurring Growth Habit] ${habit.title}`,
          description: `Daily habit checklist for category ${habit.category}.`,
          category: habit.category,
          estimatedDuration: habit.estimatedDuration,
          dueDate: todayStr,
          scope: 'daily',
          completed: false,
          completedDate: null,
          isRecurring: false
        };
        await db.addTask(newDailyTarget);
        populatedAny = true;
      }
    }
  }

  localStorage.setItem('last_recurring_population_date', todayStr);
}

// Tasks Namespace Object
const tasks = {
  addSubject,
  editSubject,
  deleteSubject,
  createTarget,
  toggleTaskCompletion,
  removeTask,
  createGrowthHabit,
  instantiateRecurringHabits
};

// =========================================================================
// 4. TIMERS & FOCUS MODE COMPONENT (Formerly timers.js)
// =========================================================================

let activeTimerType = 'stopwatch';
let timerState = 'stopped';
let intervalId = null;

let stopwatchElapsed = 0;
let countdownSecondsLeft = 0;
let pomodoroSecondsLeft = 0;
let pomodoroMode = 'work';
let currentPomodoroWorkMin = 25;
let currentPomodoroBreakMin = 5;
let activeSubjectId = '';

const MAIN_RING_CIRCUMFERENCE = 785;
const FOCUS_RING_CIRCUMFERENCE = 911;

function playChime() {
  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
  const soundEnabled = profile.soundEnabled !== false;
  if (!soundEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    
    const playTone = (freq, start, duration, vol = 0.25) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      
      gainNode.gain.setValueAtTime(vol, start);
      gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = ctx.currentTime;
    playTone(523.25, now, 0.4, 0.2);
    playTone(659.25, now + 0.1, 0.4, 0.2);
    playTone(783.99, now + 0.2, 0.6, 0.3);
    playTone(1046.50, now + 0.35, 0.8, 0.2);
  } catch (e) {
    console.warn('AudioContext failed:', e);
  }
}

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function initTimers(uiCallbacks) {
  const timerTabs = document.querySelectorAll('.timer-tabs button');
  const startBtn = document.getElementById('timer-start-btn');
  const stopBtn = document.getElementById('timer-stop-btn');
  const resetBtn = document.getElementById('timer-reset-btn');
  const subjectSelect = document.getElementById('timer-subject-select');
  
  const focusPauseBtn = document.getElementById('focus-pause-btn');
  const focusResumeBtn = document.getElementById('focus-resume-btn');
  const focusStopBtn = document.getElementById('focus-stop-btn');

  updateSubjectSelector();

  timerTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (timerState !== 'stopped') {
        alert('Please stop the current timer before switching modes.');
        return;
      }
      
      timerTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTimerType = tab.dataset.type;

      document.getElementById('timer-options-pomodoro').style.display = activeTimerType === 'pomodoro' ? 'block' : 'none';
      document.getElementById('timer-options-countdown').style.display = activeTimerType === 'countdown' ? 'block' : 'none';

      resetTimer();
    });
  });

  const presetBtns = document.querySelectorAll('.presets-grid button');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const preset = btn.dataset.preset;
      const customConfig = document.getElementById('pomodoro-custom-config');
      
      if (preset === '25-5') {
        customConfig.style.display = 'none';
        currentPomodoroWorkMin = 25;
        currentPomodoroBreakMin = 5;
      } else if (preset === '50-10') {
        customConfig.style.display = 'none';
        currentPomodoroWorkMin = 50;
        currentPomodoroBreakMin = 10;
      } else {
        customConfig.style.display = 'flex';
        currentPomodoroWorkMin = parseInt(document.getElementById('pomo-custom-work').value) || 25;
        currentPomodoroBreakMin = parseInt(document.getElementById('pomo-custom-break').value) || 5;
      }
      
      resetTimer();
    });
  });

  document.getElementById('pomo-custom-work').addEventListener('change', (e) => {
    currentPomodoroWorkMin = parseInt(e.target.value) || 25;
    resetTimer();
  });
  document.getElementById('pomo-custom-break').addEventListener('change', (e) => {
    currentPomodoroBreakMin = parseInt(e.target.value) || 5;
    resetTimer();
  });
  document.getElementById('countdown-duration').addEventListener('change', (e) => {
    countdownSecondsLeft = (parseInt(e.target.value) || 45) * 60;
    resetTimer();
  });

  startBtn.addEventListener('click', () => {
    if (timerState === 'stopped' || timerState === 'paused') {
      startTimer(uiCallbacks);
    } else {
      pauseTimer();
    }
  });

  resetBtn.addEventListener('click', () => resetTimer());
  stopBtn.addEventListener('click', () => stopAndLogTimer(uiCallbacks));

  focusPauseBtn.addEventListener('click', () => pauseTimer());
  focusResumeBtn.addEventListener('click', () => startTimer(uiCallbacks));
  focusStopBtn.addEventListener('click', () => stopAndLogTimer(uiCallbacks));

  subjectSelect.addEventListener('change', (e) => {
    activeSubjectId = e.target.value;
    updateDisplaySubject();
  });

  resetTimer();
}

function updateSubjectSelector() {
  const subjectSelect = document.getElementById('timer-subject-select');
  if (!subjectSelect) return;

  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
  const subjectsList = profile.subjects || [];

  subjectSelect.innerHTML = '';
  
  if (subjectsList.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '-- Create a Subject first --';
    subjectSelect.appendChild(opt);
    activeSubjectId = '';
  } else {
    subjectsList.forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub.id;
      opt.textContent = sub.name;
      subjectSelect.appendChild(opt);
    });
    activeSubjectId = subjectsList[0].id;
  }
  updateDisplaySubject();
}

function updateDisplaySubject() {
  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
  const subjectsList = profile.subjects || [];
  const activeSub = subjectsList.find(s => s.id === activeSubjectId);
  const label = activeSub ? activeSub.name : 'No Subject';

  const labelEl = document.getElementById('timer-display-subject');
  const focusLabelEl = document.getElementById('focus-subject-title');
  
  if (labelEl) labelEl.textContent = label;
  if (focusLabelEl) focusLabelEl.textContent = label;
}

function startTimer(uiCallbacks) {
  if (!activeSubjectId) {
    alert('Please create and select a study subject before starting a study session.');
    return;
  }

  timerState = 'running';
  toggleFocusOverlay(true);

  if (window.AndroidInterface) {
    try {
      window.AndroidInterface.setKeepScreenOn(true);
      const dndEnabled = localStorage.getItem('personal_study_os_pref_dnd') === 'true';
      if (dndEnabled && window.AndroidInterface.hasDndPermission()) {
        window.AndroidInterface.setDndMode(true);
      }
    } catch (e) {
      console.warn("AndroidInterface call failed:", e);
    }
  }
  
  document.getElementById('focus-pause-btn').style.display = 'block';
  document.getElementById('focus-resume-btn').style.display = 'none';

  document.getElementById('timer-play-icon').style.display = 'none';
  document.getElementById('timer-pause-icon').style.display = 'block';

  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(() => {
    tick(uiCallbacks);
  }, 1000);
}

function pauseTimer() {
  timerState = 'paused';
  if (intervalId) clearInterval(intervalId);

  if (window.AndroidInterface) {
    try {
      window.AndroidInterface.setKeepScreenOn(false);
      window.AndroidInterface.setDndMode(false);
    } catch (e) {
      console.warn("AndroidInterface call failed:", e);
    }
  }
  
  document.getElementById('focus-pause-btn').style.display = 'none';
  document.getElementById('focus-resume-btn').style.display = 'block';

  document.getElementById('timer-play-icon').style.display = 'block';
  document.getElementById('timer-pause-icon').style.display = 'none';
}

function resetTimer() {
  timerState = 'stopped';
  if (intervalId) clearInterval(intervalId);
  toggleFocusOverlay(false);

  if (window.AndroidInterface) {
    try {
      window.AndroidInterface.setKeepScreenOn(false);
      window.AndroidInterface.setDndMode(false);
    } catch (e) {
      console.warn("AndroidInterface call failed:", e);
    }
  }

  document.getElementById('timer-play-icon').style.display = 'block';
  document.getElementById('timer-pause-icon').style.display = 'none';

  if (activeTimerType === 'stopwatch') {
    stopwatchElapsed = 0;
    updateDisplayDigits(0);
    setProgressRing(0, 100);
  } else if (activeTimerType === 'countdown') {
    const customMin = parseInt(document.getElementById('countdown-duration').value) || 45;
    countdownSecondsLeft = customMin * 60;
    updateDisplayDigits(countdownSecondsLeft);
    setProgressRing(countdownSecondsLeft, countdownSecondsLeft);
  } else if (activeTimerType === 'pomodoro') {
    pomodoroMode = 'work';
    pomodoroSecondsLeft = currentPomodoroWorkMin * 60;
    updateDisplayDigits(pomodoroSecondsLeft);
    setProgressRing(pomodoroSecondsLeft, pomodoroSecondsLeft);
    document.getElementById('focus-timer-type-label').textContent = 'Pomodoro (Work)';
  }
}

function tick(uiCallbacks) {
  if (activeTimerType === 'stopwatch') {
    stopwatchElapsed++;
    updateDisplayDigits(stopwatchElapsed);
    const secondsMod = stopwatchElapsed % 60;
    setProgressRing(secondsMod, 60);
  } else if (activeTimerType === 'countdown') {
    if (countdownSecondsLeft > 0) {
      countdownSecondsLeft--;
      updateDisplayDigits(countdownSecondsLeft);
      const initialVal = (parseInt(document.getElementById('countdown-duration').value) || 45) * 60;
      setProgressRing(countdownSecondsLeft, initialVal);
      
      if (countdownSecondsLeft === 0) {
        playChime();
        stopAndLogTimer(uiCallbacks);
      }
    }
  } else if (activeTimerType === 'pomodoro') {
    if (pomodoroSecondsLeft > 0) {
      pomodoroSecondsLeft--;
      updateDisplayDigits(pomodoroSecondsLeft);
      
      const totalPeriod = pomodoroMode === 'work' ? currentPomodoroWorkMin * 60 : currentPomodoroBreakMin * 60;
      setProgressRing(pomodoroSecondsLeft, totalPeriod);
      
      if (pomodoroSecondsLeft === 0) {
        playChime();
        if (pomodoroMode === 'work') {
          logSession(currentPomodoroWorkMin, uiCallbacks);
          
          const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
          if (profile.autoBreak !== false) {
            pomodoroMode = 'break';
            pomodoroSecondsLeft = currentPomodoroBreakMin * 60;
            updateDisplayDigits(pomodoroSecondsLeft);
            document.getElementById('focus-timer-type-label').textContent = 'Pomodoro (Break)';
            alert('Great work! Time for a short nature break.');
          } else {
            stopAndLogTimer(uiCallbacks);
          }
        } else {
          pomodoroMode = 'work';
          pomodoroSecondsLeft = currentPomodoroWorkMin * 60;
          updateDisplayDigits(pomodoroSecondsLeft);
          document.getElementById('focus-timer-type-label').textContent = 'Pomodoro (Work)';
          alert('Break finished. Let\'s focus again!');
        }
      }
    }
  }
}

async function logSession(durationInMinutes, uiCallbacks) {
  if (durationInMinutes <= 0) return;

  const sessionDateStr = new Date().toISOString();
  const xpEarned = Math.max(1, durationInMinutes);

  const sessionObj = {
    subjectId: activeSubjectId,
    startTime: new Date(Date.now() - durationInMinutes * 60000).toISOString(),
    duration: durationInMinutes,
    timerType: activeTimerType,
    xpEarned: xpEarned,
    date: sessionDateStr
  };

  await db.addSession(sessionObj);
  const xpResult = await gamify.addXP(xpEarned, `Completed ${durationInMinutes}m study session`);

  if (uiCallbacks && uiCallbacks.onSessionLogged) {
    uiCallbacks.onSessionLogged(xpResult);
  }
}

function stopAndLogTimer(uiCallbacks) {
  let loggedMinutes = 0;

  if (activeTimerType === 'stopwatch') {
    loggedMinutes = Math.round(stopwatchElapsed / 60);
    if (stopwatchElapsed >= 30) {
      loggedMinutes = Math.max(1, Math.round(stopwatchElapsed / 60));
      logSession(loggedMinutes, uiCallbacks);
    }
  } else if (activeTimerType === 'countdown') {
    const initialVal = (parseInt(document.getElementById('countdown-duration').value) || 45) * 60;
    const elapsedSec = initialVal - countdownSecondsLeft;
    loggedMinutes = Math.round(elapsedSec / 60);
    if (elapsedSec >= 30) {
      loggedMinutes = Math.max(1, Math.round(elapsedSec / 60));
      logSession(loggedMinutes, uiCallbacks);
    }
  } else if (activeTimerType === 'pomodoro') {
    if (pomodoroMode === 'work') {
      const initialVal = currentPomodoroWorkMin * 60;
      const elapsedSec = initialVal - pomodoroSecondsLeft;
      loggedMinutes = Math.round(elapsedSec / 60);
      if (elapsedSec >= 30) {
        loggedMinutes = Math.max(1, Math.round(elapsedSec / 60));
        logSession(loggedMinutes, uiCallbacks);
      }
    }
  }

  resetTimer();
}

function toggleFocusOverlay(isActive) {
  const overlay = document.getElementById('focus-overlay');
  if (!overlay) return;

  if (isActive) {
    overlay.classList.add('active');
    document.getElementById('focus-timer-type-label').textContent = 
      activeTimerType === 'pomodoro' ? `Pomodoro (${pomodoroMode.toUpperCase()})` : activeTimerType.toUpperCase();
  } else {
    overlay.classList.remove('active');
  }
}

function updateDisplayDigits(seconds) {
  const formatted = formatTime(seconds);
  document.getElementById('timer-display-digits').textContent = formatted;
  document.getElementById('focus-digits-display').textContent = formatted;
}

function setProgressRing(current, total) {
  const mainRing = document.getElementById('timer-ring-fill');
  const focusRing = document.getElementById('focus-ring-fill');

  const ratio = total > 0 ? (total - current) / total : 0;
  
  if (mainRing) {
    const mainOffset = MAIN_RING_CIRCUMFERENCE - (ratio * MAIN_RING_CIRCUMFERENCE);
    mainRing.style.strokeDashoffset = mainOffset;
  }
  
  if (focusRing) {
    const focusOffset = FOCUS_RING_CIRCUMFERENCE - (ratio * FOCUS_RING_CIRCUMFERENCE);
    focusRing.style.strokeDashoffset = focusOffset;
  }
}

// Timers Namespace Object
const timers = {
  playChime,
  formatTime,
  initTimers,
  updateSubjectSelector,
  updateDisplaySubject,
  startTimer,
  pauseTimer,
  resetTimer,
  tick,
  logSession,
  stopAndLogTimer,
  toggleFocusOverlay,
  updateDisplayDigits,
  setProgressRing
};

// =========================================================================
// 5. CHARTS COMPONENT (Formerly charts.js)
// =========================================================================

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    "L", x, y,
    "Z"
  ].join(" ");
}

function drawStudyHoursChart(sessions, timeframe = 'daily') {
  const svg = document.getElementById('study-hours-chart');
  if (!svg) return;

  svg.innerHTML = '';
  const width = 600;
  const height = 280;
  const paddingLeft = 50;
  const paddingBottom = 40;
  const paddingTop = 20;
  const paddingRight = 20;

  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;

  const now = new Date();
  const dataPoints = [];

  if (timeframe === 'daily') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
      
      const daySessions = sessions.filter(s => s.date && s.date.startsWith(dateStr));
      const hours = daySessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
      dataPoints.push({ label, value: hours, rawDate: dateStr });
    }
  } else if (timeframe === 'weekly') {
    const todayDayOfWeekHelper = (day) => day === 0 ? 6 : day - 1;
    for (let i = 3; i >= 0; i--) {
      const start = new Date();
      start.setDate(now.getDate() - (i * 7 + todayDayOfWeekHelper(now.getDay())));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      
      const label = `Wk -${i}`;
      
      const weekSessions = sessions.filter(s => {
        if (!s.date) return false;
        const sDate = new Date(s.date);
        return sDate >= start && sDate <= end;
      });
      const hours = weekSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
      dataPoints.push({ label, value: hours });
    }
  } else if (timeframe === 'monthly') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString(undefined, { month: 'short' });
      
      const monthSessions = sessions.filter(s => {
        if (!s.date) return false;
        const sDate = new Date(s.date);
        return sDate.getFullYear() === d.getFullYear() && sDate.getMonth() === d.getMonth();
      });
      const hours = monthSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
      dataPoints.push({ label, value: hours });
    }
  }

  drawLineOrArea(svg, dataPoints, graphWidth, graphHeight, paddingLeft, paddingTop, 'h');
}

function drawSubjectPieChart(sessions) {
  const svg = document.getElementById('subject-pie-chart');
  const rankingList = document.getElementById('subject-ranking-list');
  if (!svg) return;

  svg.innerHTML = '';
  if (rankingList) rankingList.innerHTML = '';

  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
  const subjectsList = profile.subjects || [];

  if (subjectsList.length === 0 || sessions.length === 0) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '150');
    circle.setAttribute('cy', '140');
    circle.setAttribute('r', '90');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', 'rgba(100,100,100,0.1)');
    circle.setAttribute('stroke-width', '16');
    svg.appendChild(circle);
    
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', '150');
    txt.setAttribute('y', '145');
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('fill', 'var(--text-muted)');
    txt.setAttribute('font-size', '14px');
    txt.textContent = 'No Study Logs Available';
    svg.appendChild(txt);
    return;
  }

  const subjectSums = {};
  subjectsList.forEach(sub => { subjectSums[sub.id] = 0; });

  sessions.forEach(s => {
    if (subjectSums[s.subjectId] !== undefined) {
      subjectSums[s.subjectId] += (s.duration || 0);
    }
  });

  const totalDuration = Object.values(subjectSums).reduce((acc, val) => acc + val, 0);

  if (totalDuration === 0) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '150');
    circle.setAttribute('cy', '140');
    circle.setAttribute('r', '90');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', 'rgba(100,100,100,0.1)');
    circle.setAttribute('stroke-width', '16');
    svg.appendChild(circle);
    
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', '150');
    txt.setAttribute('y', '145');
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('fill', 'var(--text-muted)');
    txt.setAttribute('font-size', '14px');
    txt.textContent = '0 Hours Studied';
    svg.appendChild(txt);
    return;
  }

  const ranked = subjectsList.map(sub => ({
    name: sub.name,
    color: sub.color || 'var(--primary)',
    duration: subjectSums[sub.id],
    pct: subjectSums[sub.id] / totalDuration
  })).filter(s => s.duration > 0).sort((a,b) => b.duration - a.duration);

  if (rankingList) {
    ranked.forEach((item, index) => {
      const li = document.createElement('li');
      const hours = (item.duration / 60).toFixed(1);
      li.innerHTML = `
        <span style="font-weight: 600; display: inline-flex; align-items: center; gap: 8px;">
          <span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${item.color}; display: inline-block;"></span>
          ${item.name}
        </span>
        <span style="color: var(--text-muted); float: right;">${hours}h (${Math.round(item.pct * 100)}%)</span>
      `;
      rankingList.appendChild(li);
    });
  }

  let currentAngle = 0;
  ranked.forEach(item => {
    const sliceAngle = item.pct * 360;
    const pathData = describeArc(150, 140, 95, currentAngle, currentAngle + sliceAngle);
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', item.color);
    path.setAttribute('stroke', 'var(--bg-color)');
    path.setAttribute('stroke-width', '2');
    
    path.style.cursor = 'pointer';
    path.style.transition = 'transform 0.2s';
    path.addEventListener('mouseover', () => {
      path.setAttribute('opacity', '0.85');
    });
    path.addEventListener('mouseout', () => {
      path.setAttribute('opacity', '1');
    });

    svg.appendChild(path);
    currentAngle += sliceAngle;
  });

  const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  innerCircle.setAttribute('cx', '150');
  innerCircle.setAttribute('cy', '140');
  innerCircle.setAttribute('r', '55');
  innerCircle.setAttribute('fill', 'var(--card-bg)');
  svg.appendChild(innerCircle);

  const txtLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  txtLabel.setAttribute('x', '150');
  txtLabel.setAttribute('y', '145');
  txtLabel.setAttribute('text-anchor', 'middle');
  txtLabel.setAttribute('fill', 'var(--text-main)');
  txtLabel.setAttribute('font-weight', 'bold');
  txtLabel.setAttribute('font-size', '14px');
  txtLabel.textContent = `${(totalDuration / 60).toFixed(1)} hrs`;
  svg.appendChild(txtLabel);
}

function drawXPProgressChart(xpLogs) {
  const svg = document.getElementById('xp-progress-chart');
  if (!svg) return;

  svg.innerHTML = '';
  const width = 600;
  const height = 280;
  const paddingLeft = 50;
  const paddingBottom = 40;
  const paddingTop = 20;
  const paddingRight = 20;

  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;

  const now = new Date();
  const rawPoints = [];

  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
  let currentCumulativeXP = profile.xp || 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString(undefined, { weekday: 'short' });

    const logSum = xpLogs
      .filter(x => x.timestamp && x.timestamp.startsWith(dateStr))
      .reduce((acc, x) => acc + (x.amount || 0), 0);

    rawPoints.push({ label, value: currentCumulativeXP, dateStr });
    currentCumulativeXP = Math.max(0, currentCumulativeXP - logSum);
  }

  const orderedPoints = rawPoints.reverse();
  drawLineOrArea(svg, orderedPoints, graphWidth, graphHeight, paddingLeft, paddingTop, 'xp');
}

async function drawTaskCompletionChart(tasksList) {
  const svg = document.getElementById('task-completion-chart');
  if (!svg) return;

  svg.innerHTML = '';
  const width = 600;
  const height = 280;
  const paddingLeft = 50;
  const paddingBottom = 40;
  const paddingTop = 25;
  const paddingRight = 20;

  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;

  const now = new Date();
  const daysData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString(undefined, { weekday: 'short' });

    const dayTasks = tasksList.filter(t => t.dueDate === dateStr);
    const completed = dayTasks.filter(t => t.completed).length;
    const total = dayTasks.length;

    daysData.push({ label, completed, total });
  }

  const maxTasks = Math.max(5, ...daysData.map(d => d.total));

  for (let i = 0; i <= 4; i++) {
    const yVal = Math.round((maxTasks / 4) * i);
    const yPos = paddingTop + graphHeight - (graphHeight / 4) * i;

    const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    gridLine.setAttribute('x1', String(paddingLeft));
    gridLine.setAttribute('y1', String(yPos));
    gridLine.setAttribute('x2', String(width - paddingRight));
    gridLine.setAttribute('y2', String(yPos));
    gridLine.setAttribute('stroke', 'rgba(100, 150, 100, 0.08)');
    gridLine.setAttribute('stroke-dasharray', '4');
    svg.appendChild(gridLine);

    const textLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textLabel.setAttribute('x', String(paddingLeft - 12));
    textLabel.setAttribute('y', String(yPos + 4));
    textLabel.setAttribute('text-anchor', 'end');
    textLabel.setAttribute('fill', 'var(--text-muted)');
    textLabel.setAttribute('font-size', '11px');
    textLabel.textContent = String(yVal);
    svg.appendChild(textLabel);
  }

  const colWidth = graphWidth / daysData.length;
  const barPadding = 12;

  daysData.forEach((d, index) => {
    const xPos = paddingLeft + colWidth * index + barPadding;
    const activeWidth = colWidth - barPadding * 2;

    const totalHeight = d.total > 0 ? (d.total / maxTasks) * graphHeight : 0;
    const totalY = paddingTop + graphHeight - totalHeight;

    if (totalHeight > 0) {
      const bgBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgBar.setAttribute('x', String(xPos));
      bgBar.setAttribute('y', String(totalY));
      bgBar.setAttribute('width', String(activeWidth));
      bgBar.setAttribute('height', String(totalHeight));
      bgBar.setAttribute('fill', 'var(--bg-color)');
      bgBar.setAttribute('rx', '4');
      svg.appendChild(bgBar);
    }

    const compHeight = d.completed > 0 ? (d.completed / maxTasks) * graphHeight : 0;
    const compY = paddingTop + graphHeight - compHeight;

    if (compHeight > 0) {
      const fgBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      fgBar.setAttribute('x', String(xPos));
      fgBar.setAttribute('y', String(compY));
      fgBar.setAttribute('width', String(activeWidth));
      fgBar.setAttribute('height', String(compHeight));
      fgBar.setAttribute('fill', 'var(--primary)');
      fgBar.setAttribute('rx', '4');
      fgBar.style.transition = 'height 0.5s';
      svg.appendChild(fgBar);
    }

    const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xLabel.setAttribute('x', String(xPos + activeWidth / 2));
    xLabel.setAttribute('y', String(height - paddingBottom + 20));
    xLabel.setAttribute('text-anchor', 'middle');
    xLabel.setAttribute('fill', 'var(--text-muted)');
    xLabel.setAttribute('font-size', '11px');
    xLabel.setAttribute('font-weight', '500');
    xLabel.textContent = d.label;
    svg.appendChild(xLabel);
  });
}

function drawLineOrArea(svg, dataPoints, graphWidth, graphHeight, paddingLeft, paddingTop, type = 'h') {
  const maxVal = Math.max(type === 'xp' ? 100 : 3, ...dataPoints.map(d => d.value));

  for (let i = 0; i <= 4; i++) {
    const yVal = (maxVal / 4) * i;
    const yPos = paddingTop + graphHeight - (graphHeight / 4) * i;

    const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    gridLine.setAttribute('x1', String(paddingLeft));
    gridLine.setAttribute('y1', String(yPos));
    gridLine.setAttribute('x2', String(paddingLeft + graphWidth));
    gridLine.setAttribute('y2', String(yPos));
    gridLine.setAttribute('stroke', 'rgba(100, 150, 100, 0.08)');
    gridLine.setAttribute('stroke-dasharray', '4');
    svg.appendChild(gridLine);

    const textLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textLabel.setAttribute('x', String(paddingLeft - 12));
    textLabel.setAttribute('y', String(yPos + 4));
    textLabel.setAttribute('text-anchor', 'end');
    textLabel.setAttribute('fill', 'var(--text-muted)');
    textLabel.setAttribute('font-size', '11px');
    textLabel.textContent = type === 'xp' ? String(Math.round(yVal)) : yVal.toFixed(1) + (type === 'h' ? 'h' : '');
    svg.appendChild(textLabel);
  }

  const points = [];
  const colWidth = graphWidth / (dataPoints.length - 1 || 1);

  dataPoints.forEach((d, index) => {
    const x = paddingLeft + colWidth * index;
    const y = paddingTop + graphHeight - (d.value / maxVal) * graphHeight;
    points.push({ x, y, label: d.label, value: d.value });

    const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xLabel.setAttribute('x', String(x));
    xLabel.setAttribute('y', String(paddingTop + graphHeight + 22));
    xLabel.setAttribute('text-anchor', 'middle');
    xLabel.setAttribute('fill', 'var(--text-muted)');
    xLabel.setAttribute('font-size', '11px');
    xLabel.setAttribute('font-weight', '500');
    xLabel.textContent = d.label;
    svg.appendChild(xLabel);
  });

  if (points.length < 2) return;

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
  }

  if (type === 'xp') {
    let fillD = pathD + ` L ${points[points.length - 1].x} ${paddingTop + graphHeight} L ${points[0].x} ${paddingTop + graphHeight} Z`;
    const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    areaPath.setAttribute('d', fillD);
    areaPath.setAttribute('fill', 'rgba(74, 222, 128, 0.15)');
    svg.appendChild(areaPath);
  }

  const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  linePath.setAttribute('d', pathD);
  linePath.setAttribute('fill', 'none');
  linePath.setAttribute('stroke', 'var(--primary)');
  linePath.setAttribute('stroke-width', '3');
  linePath.setAttribute('stroke-linecap', 'round');
  linePath.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(linePath);

  points.forEach(pt => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(pt.x));
    circle.setAttribute('cy', String(pt.y));
    circle.setAttribute('r', '5');
    circle.setAttribute('fill', 'var(--bg-color)');
    circle.setAttribute('stroke', 'var(--primary)');
    circle.setAttribute('stroke-width', '3');
    
    circle.style.cursor = 'pointer';
    circle.style.transition = 'transform 0.1s';
    
    circle.addEventListener('mouseover', (e) => {
      circle.setAttribute('r', '7');
      circle.setAttribute('stroke-width', '4');
    });

    circle.addEventListener('mouseout', () => {
      circle.setAttribute('r', '5');
      circle.setAttribute('stroke-width', '3');
    });

    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${pt.label}: ${pt.value.toFixed(1)}${type === 'h' ? ' hrs' : type === 'xp' ? ' XP' : ''}`;
    circle.appendChild(title);

    svg.appendChild(circle);
  });
}

// Charts Namespace Object
const charts = {
  polarToCartesian,
  describeArc,
  drawStudyHoursChart,
  drawSubjectPieChart,
  drawXPProgressChart,
  drawTaskCompletionChart,
  drawLineOrArea
};

// =========================================================================
// 6. DATA MANAGER COMPONENT (Formerly data-manager.js)
// =========================================================================

function downloadFile(filename, content, contentType) {
  const blob = new Blob([content], { type: contentType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

async function backupData() {
  try {
    const data = await db.getBackupData();
    const jsonString = JSON.stringify(data, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(`study_os_backup_${dateStr}.json`, jsonString, 'application/json');
    return true;
  } catch (err) {
    console.error('Backup failed:', err);
    alert('Failed to back up local data: ' + err.message);
    return false;
  }
}

async function restoreData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version || !data.localStorage) {
          throw new Error('Invalid backup file structure.');
        }

        const confirmRestore = confirm(
          'WARNING: Restoring this backup will overwrite ALL current settings, study history, and tasks. Do you want to proceed?'
        );
        if (!confirmRestore) return resolve(false);

        await db.restoreBackupData(data);
        resolve(true);
      } catch (err) {
        console.error('Restore failed:', err);
        alert('Failed to restore backup: ' + err.message);
        resolve(false);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

async function exportToCSV() {
  try {
    const sessions = await db.getAllSessions();
    const tasksList = await db.getAllTasks();
    
    const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
    const subjectsList = profile.subjects || [];
    const subjectsMap = {};
    subjectsList.forEach(s => { subjectsMap[s.id] = s.name; });

    let sessionsCSV = 'Session ID,Subject,Start Time,Duration (Mins),Timer Type,XP Earned,Date\n';
    sessions.forEach(s => {
      const subName = subjectsMap[s.subjectId] || 'Deleted Subject';
      const cleanTitle = subName.replace(/"/g, '""');
      sessionsCSV += `"${s.id}","${cleanTitle}","${s.startTime}",${s.duration},"${s.timerType}",${s.xpEarned},"${s.date}"\n`;
    });

    let tasksCSV = 'Task ID,Title,Description,Category,Duration (Mins),Due Date,Completed,Completed Date,Is Recurring,Recurrence\n';
    tasksList.forEach(t => {
      const cleanTitle = t.title.replace(/"/g, '""');
      const cleanDesc = (t.description || '').replace(/"/g, '""');
      const recurrenceType = t.recurrenceType || '';
      tasksCSV += `"${t.id}","${cleanTitle}","${cleanDesc}","${t.category}",${t.estimatedDuration},"${t.dueDate}",${t.completed},"${t.completedDate || ''}",${t.isRecurring},"${recurrenceType}"\n`;
    });

    const dateStr = new Date().toISOString().split('T')[0];
    
    downloadFile(`study_sessions_${dateStr}.csv`, sessionsCSV, 'text/csv;charset=utf-8;');
    
    setTimeout(() => {
      downloadFile(`study_tasks_${dateStr}.csv`, tasksCSV, 'text/csv;charset=utf-8;');
    }, 500);

    return true;
  } catch (err) {
    console.error('CSV Export failed:', err);
    alert('Failed to export CSVs: ' + err.message);
    return false;
  }
}

function printReport() {
  const styleEl = document.createElement('style');
  styleEl.id = 'print-report-style';
  styleEl.innerHTML = `
    @media print {
      body {
        background: white !important;
        color: black !important;
      }
      #sidebar, .theme-toggle-container, button, .modal-overlay, #focus-overlay, .theme-toggle-btn {
        display: none !important;
      }
      #main-content {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
      }
      .view-section {
        display: block !important;
        page-break-after: always;
      }
      .card {
        background: none !important;
        border: 1px solid #ccc !important;
        box-shadow: none !important;
        backdrop-filter: none !important;
        margin-bottom: 20px !important;
        page-break-inside: avoid;
      }
      svg {
        max-width: 100% !important;
      }
    }
  `;
  document.head.appendChild(styleEl);

  window.print();

  setTimeout(() => {
    const el = document.getElementById('print-report-style');
    if (el) el.remove();
  }, 1000);
}

async function resetDatabase() {
  const confirmWipe = confirm(
    'CRITICAL WARNING: This action will permanently erase ALL logged study times, accomplishments, task history, and settings. This cannot be undone. Are you absolutely sure you want to reset?'
  );
  
  if (confirmWipe) {
    const finalConfirm = prompt('Type "RESET" to confirm deletion:');
    if (finalConfirm === 'RESET') {
      await db.wipeDatabase();
      window.location.reload();
    } else {
      alert('Reset cancelled. Confirmation text did not match.');
    }
  }
}

// Data Manager Namespace Object
const dataMgr = {
  backupData,
  restoreData,
  exportToCSV,
  printReport,
  resetDatabase
};

// =========================================================================
// 7. UI RENDERING COMPONENT (Formerly ui.js)
// =========================================================================

let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth();

function initUI(appControllerCallbacks) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.dataset.view;
      switchView(targetView);
    });
  });

  const themeToggle = document.getElementById('theme-toggle-btn');
  themeToggle.addEventListener('click', toggleTheme);

  const avatarOptions = document.querySelectorAll('.avatar-option');
  avatarOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      avatarOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });

  const onboardingForm = document.getElementById('onboarding-form');
  onboardingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleOnboardingSubmit(appControllerCallbacks);
  });

  const subjectForm = document.getElementById('modal-subject-form');
  subjectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubjectSubmit(appControllerCallbacks);
  });

  const taskForm = document.getElementById('modal-task-form');
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleTaskSubmit(appControllerCallbacks);
  });

  const growthForm = document.getElementById('modal-growth-form');
  growthForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleGrowthSubmit(appControllerCallbacks);
  });

  const reminderForm = document.getElementById('modal-reminder-form');
  reminderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleReminderSubmit(appControllerCallbacks);
  });

  const prefForm = document.getElementById('preferences-form');
  prefForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handlePreferencesSubmit();
  });

  const growthRecurSelect = document.getElementById('growth-recurrence');
  growthRecurSelect.addEventListener('change', (e) => {
    const isSpecific = e.target.value === 'specific';
    document.getElementById('growth-specific-days-panel').style.display = isSpecific ? 'block' : 'none';
  });

  const reminderFreqSelect = document.getElementById('reminder-frequency');
  reminderFreqSelect.addEventListener('change', (e) => {
    const isCustom = e.target.value === 'custom';
    document.getElementById('reminder-custom-days-container').style.display = isCustom ? 'block' : 'none';
  });

  document.getElementById('dashboard-start-timer-btn').addEventListener('click', () => switchView('timers'));
  document.getElementById('dashboard-manage-targets-btn').addEventListener('click', () => switchView('targets'));
  document.getElementById('add-subject-btn').addEventListener('click', () => openSubjectModal());
  document.getElementById('add-task-btn').addEventListener('click', () => openTaskModal());
  document.getElementById('add-growth-btn').addEventListener('click', () => openGrowthModal());
  document.getElementById('settings-add-reminder-btn').addEventListener('click', () => openReminderModal());

  document.getElementById('data-export-pdf-btn').addEventListener('click', () => dataMgr.printReport());
  document.getElementById('data-export-csv-btn').addEventListener('click', () => dataMgr.exportToCSV());
  document.getElementById('data-backup-btn').addEventListener('click', () => dataMgr.backupData());
  document.getElementById('data-reset-btn').addEventListener('click', () => dataMgr.resetDatabase());
  
  document.getElementById('data-restore-input').addEventListener('change', async (e) => {
    if (e.target.files && e.target.files[0]) {
      const restored = await dataMgr.restoreData(e.target.files[0]);
      if (restored) window.location.reload();
    }
  });

  document.getElementById('calendar-prev-month').addEventListener('click', () => {
    currentCalendarMonth--;
    if (currentCalendarMonth < 0) {
      currentCalendarMonth = 11;
      currentCalendarYear--;
    }
    renderCalendar();
  });
  document.getElementById('calendar-next-month').addEventListener('click', () => {
    currentCalendarMonth++;
    if (currentCalendarMonth > 11) {
      currentCalendarMonth = 0;
      currentCalendarYear++;
    }
    renderCalendar();
  });

  document.getElementById('chart-timeframe-select').addEventListener('change', async (e) => {
    const sessions = await db.getAllSessions();
    charts.drawStudyHoursChart(sessions, e.target.value);
  });
}

async function switchView(viewName) {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.view-section');

  navItems.forEach(item => {
    if (item.dataset.view === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  sections.forEach(sec => {
    if (sec.id === `view-${viewName}`) {
      sec.classList.add('active');
    } else {
      sec.classList.remove('active');
    }
  });

  if (viewName === 'dashboard') {
    await updateDashboardView();
  } else if (viewName === 'timers') {
    timers.updateSubjectSelector();
  } else if (viewName === 'targets') {
    await updateTargetsView();
  } else if (viewName === 'growth') {
    await updateGrowthView();
  } else if (viewName === 'achievements') {
    await updateAchievementsView();
  } else if (viewName === 'analytics') {
    await updateAnalyticsView();
  } else if (viewName === 'settings') {
    await updateSettingsView();
  }
}

function toggleTheme() {
  const body = document.body;
  const oldTheme = body.getAttribute('data-theme') || 'light';
  const newTheme = oldTheme === 'light' ? 'dark' : 'light';
  body.setAttribute('data-theme', newTheme);
  
  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
  profile.theme = newTheme;
  localStorage.setItem('personal_study_os_profile', JSON.stringify(profile));

  const textSpan = document.querySelector('#theme-toggle-btn span');
  if (textSpan) {
    textSpan.textContent = newTheme === 'light' ? 'Dark Mode' : 'Light Mode';
  }
}

function loadThemePreference() {
  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
  const theme = profile.theme || 'light';
  document.body.setAttribute('data-theme', theme);
  const textSpan = document.querySelector('#theme-toggle-btn span');
  if (textSpan) {
    textSpan.textContent = theme === 'light' ? 'Dark Mode' : 'Light Mode';
  }
}

async function updateDashboardView() {
  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
  if (!profile.username) return;

  document.getElementById('dashboard-welcome').textContent = `Hello, ${profile.username}!`;
  document.getElementById('sidebar-username').textContent = profile.username;
  document.getElementById('sidebar-level').textContent = profile.level || 1;

  const avatarKey = profile.avatar || 'sprout';
  const avatarImgMap = {
    sprout: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232e7d32'><path d='M12 2C11.5 2 10 3 10 5.5C10 7.5 11.5 9 12 9.5C12.5 9 14 7.5 14 5.5C14 3 12.5 2 12 2M12 9.5V22H10V14.5C8 14.5 5 13 5 10C5 7.5 7.5 7.5 8 7.5C8.5 7.5 10 8 10 10.5C10 12.5 11.5 14 12 14.5'/></svg>",
    acorn: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%238d6e63'><path d='M12,2A3,3 0 0,1 15,5V6H9V5A3,3 0 0,1 12,2M19,8A7,7 0 0,1 12,15A7,7 0 0,1 5,8V7H19V8M12,16A4,4 0 0,0 16,12V11H8V12A4,4 0 0,0 12,16Z'/></svg>",
    ladybug: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23d32f2f'><path d='M12,2A8,8 0 0,1 20,10C20,14.42 16.42,18 12,18C7.58,18 4,14.42 4,10A8,8 0 0,1 12,2M12,4A6,6 0 0,0 6,10H18A6,6 0 0,0 12,4M12,11A1,1 0 0,1 13,12A1,1 0 0,1 12,13A1,1 0 0,1 11,12A1,1 0 0,1 12,11M16,13A1,1 0 0,1 17,14A1,1 0 0,1 16,15A1,1 0 0,1 15,14A1,1 0 0,1 16,13M8,13A1,1 0 0,1 9,14A1,1 0 0,1 8,15A1,1 0 0,1 7,14A1,1 0 0,1 8,13Z'/></svg>",
    leaf: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234caf50'><path d='M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L7.38,17.8C9.5,18.8 12,18.8 14.2,17.8L15.8,22L17.7,21.3L15.6,16C17.7,14 18.8,11 17,8Z'/></svg>",
    mushroom: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23fb923c'><path d='M12,2A10,10 0 0,0 2,12H6A1,1 0 0,0 7,13V20A2,2 0 0,0 9,22H15A2,2 0 0,0 17,20V13A1,1 0 0,0 18,12H22A10,10 0 0,0 12,2M12,4A8,8 0 0,1 19.9,10H4.1A8,8 0 0,1 12,4Z'/></svg>",
    flower: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ba68c8'><path d='M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M6,12A2,2 0 0,1 8,10A2,2 0 0,1 10,12A2,2 0 0,1 8,14A2,2 0 0,1 6,12M12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20M18,12A2,2 0 0,1 16,14A2,2 0 0,1 14,12A2,2 0 0,1 16,10A2,2 0 0,1 18,12Z'/></svg>"
  };
  document.getElementById('sidebar-avatar').src = avatarImgMap[avatarKey];

  const streakBadge = document.getElementById('streak-badge-container');
  const streakSpan = document.getElementById('dashboard-streak');
  if (profile.currentStreak > 0) {
    streakBadge.style.display = 'inline-flex';
    streakSpan.textContent = profile.currentStreak;
  } else {
    streakBadge.style.display = 'none';
  }

  const currentXP = profile.xp || 0;
  const level = profile.level || 1;
  const baseXP = gamify.xpForLevel(level);
  const nextXP = gamify.xpForLevel(level + 1);
  const currentLevelProgress = currentXP - baseXP;
  const neededXPForNext = nextXP - baseXP;
  const pctProgress = neededXPForNext > 0 ? (currentLevelProgress / neededXPForNext) * 100 : 0;

  document.getElementById('dash-level-val').textContent = level;
  document.getElementById('dash-xp-text').textContent = `${currentXP} / ${nextXP} XP`;
  document.getElementById('dash-xp-progress').style.width = `${pctProgress}%`;

  const sessions = await db.getAllSessions();
  const tasksList = await db.getAllTasks();

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const offset = now.getTimezoneOffset();
  const localToday = new Date(now.getTime() - (offset * 60 * 1000));
  
  const matchesToday = (dateStr) => dateStr && dateStr.startsWith(todayStr);

  const getWeekRange = () => {
    const curr = new Date();
    const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1);
    const firstDay = new Date(curr.setDate(first));
    firstDay.setHours(0,0,0,0);
    const lastDay = new Date(firstDay);
    lastDay.setDate(firstDay.getDate() + 6);
    lastDay.setHours(23,59,59,999);
    return { start: firstDay, end: lastDay };
  };
  const weekRange = getWeekRange();

  const hoursToday = sessions.filter(s => matchesToday(s.date)).reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
  const hoursWeek = sessions.filter(s => {
    if (!s.date) return false;
    const sd = new Date(s.date);
    return sd >= weekRange.start && sd <= weekRange.end;
  }).reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
  const hoursMonth = sessions.filter(s => {
    if (!s.date) return false;
    const sd = new Date(s.date);
    return sd.getFullYear() === now.getFullYear() && sd.getMonth() === now.getMonth();
  }).reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
  const hoursLifetime = sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;

  document.getElementById('stat-hours-today').textContent = `${hoursToday.toFixed(1)}h`;
  document.getElementById('stat-hours-week').textContent = `${hoursWeek.toFixed(1)}h`;
  document.getElementById('stat-hours-month').textContent = `${hoursMonth.toFixed(1)}h`;
  document.getElementById('stat-hours-lifetime').textContent = `${hoursLifetime.toFixed(1)}h`;

  const subjectsGrid = document.getElementById('subjects-grid');
  subjectsGrid.innerHTML = '';
  const subjectsList = profile.subjects || [];

  document.getElementById('subjects-count-label').textContent = `${subjectsList.length} / 10 subjects`;

  subjectsList.forEach(sub => {
    const subSessions = sessions.filter(s => s.subjectId === sub.id);
    const subHoursTotal = subSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
    
    const subHoursToday = subSessions.filter(s => matchesToday(s.date)).reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
    const subHoursWeek = subSessions.filter(s => {
      if(!s.date) return false;
      const sd = new Date(s.date);
      return sd >= weekRange.start && sd <= weekRange.end;
    }).reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
    const subHoursMonth = subSessions.filter(s => {
      if(!s.date) return false;
      const sd = new Date(s.date);
      return sd.getFullYear() === now.getFullYear() && sd.getMonth() === now.getMonth();
    }).reduce((acc, s) => acc + (s.duration || 0), 0) / 60;

    const sessionsToday = subSessions.filter(s => matchesToday(s.date)).length;
    const sessionsWeek = subSessions.filter(s => {
      if(!s.date) return false;
      const sd = new Date(s.date);
      return sd >= weekRange.start && sd <= weekRange.end;
    }).length;
    const sessionsMonth = subSessions.filter(s => {
      if(!s.date) return false;
      const sd = new Date(s.date);
      return sd.getFullYear() === now.getFullYear() && sd.getMonth() === now.getMonth();
    }).length;

    const avgDuration = subSessions.length > 0 
      ? Math.round(subSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / subSessions.length)
      : 0;

    const card = document.createElement('div');
    card.className = 'card subject-card';
    card.style.setProperty('--sub-color', sub.color);
    
    card.innerHTML = `
      <div class="subject-header">
        <span class="subject-title">${sub.name}</span>
        <div style="display: flex; gap: 4px;">
          <button class="task-btn" onclick="window.editSubjectTrigger('${sub.id}')" title="Edit Subject">
            <svg viewBox="0 0 24 24" style="width: 14px; height: 14px;"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.07,6.19L3,17.25Z"/></svg>
          </button>
          <button class="task-btn btn-delete" onclick="window.deleteSubjectTrigger('${sub.id}')" title="Delete Subject">
            <svg viewBox="0 0 24 24" style="width: 14px; height: 14px;"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
          </button>
        </div>
      </div>
      <div class="subject-stats-list">
        <div class="subject-stats-row"><span>Today's Hours:</span><strong>${subHoursToday.toFixed(1)}h (${sessionsToday} sess)</strong></div>
        <div class="subject-stats-row"><span>Weekly Hours:</span><strong>${subHoursWeek.toFixed(1)}h (${sessionsWeek} sess)</strong></div>
        <div class="subject-stats-row"><span>Monthly Hours:</span><strong>${subHoursMonth.toFixed(1)}h (${sessionsMonth} sess)</strong></div>
        <div class="subject-stats-row"><span>Total Hours:</span><strong>${subHoursTotal.toFixed(1)}h</strong></div>
        <div class="subject-stats-row"><span>Avg Session:</span><strong>${avgDuration} mins</strong></div>
      </div>
    `;
    subjectsGrid.appendChild(card);
  });

  const previewList = document.getElementById('dashboard-tasks-preview');
  previewList.innerHTML = '';
  const todayTasks = tasksList.filter(t => t.dueDate === todayStr);

  const completedCount = todayTasks.filter(t => t.completed).length;
  const totalCount = todayTasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  document.getElementById('target-progress-percentage').textContent = `${progressPct}% Complete`;
  document.getElementById('target-progress-bar').style.width = `${progressPct}%`;

  if (todayTasks.length === 0) {
    previewList.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem; text-align:center; padding: 20px 0;">No targets created for today.</p>';
  } else {
    todayTasks.forEach(task => {
      const item = document.createElement('div');
      item.className = `task-item ${task.completed ? 'completed' : ''}`;
      
      const catColor = getCategoryColor(task.category);
      item.innerHTML = `
        <div class="task-checkbox-container">
          <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="window.toggleTaskTrigger(${task.id}, this.checked)">
        </div>
        <div class="task-item-content">
          <div class="task-item-title">${task.title}</div>
          <div class="task-tags-row">
            <span class="task-badge badge-cat" style="--cat-color-rgb: ${catColor}">${task.category}</span>
            <span class="task-badge badge-duration">${task.estimatedDuration}m</span>
          </div>
        </div>
      `;
      previewList.appendChild(item);
    });
  }
}

async function updateTargetsView() {
  const tasksList = await db.getAllTasks();
  const dailyList = document.getElementById('daily-tasks-list');
  const weeklyList = document.getElementById('weekly-tasks-list');

  dailyList.innerHTML = '';
  weeklyList.innerHTML = '';

  const todayStr = new Date().toISOString().split('T')[0];
  const dailyTasks = tasksList.filter(t => !t.isRecurring && t.scope === 'daily' && t.dueDate === todayStr);
  const weeklyTasks = tasksList.filter(t => !t.isRecurring && t.scope === 'weekly');

  const activeDailyCount = dailyTasks.filter(t => !t.completed).length;
  const activeWeeklyCount = weeklyTasks.filter(t => !t.completed).length;

  document.getElementById('daily-remaining-label').textContent = `${activeDailyCount} remaining`;
  document.getElementById('weekly-remaining-label').textContent = `${activeWeeklyCount} remaining`;

  const renderList = (domList, tasksGroup) => {
    if (tasksGroup.length === 0) {
      domList.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem; padding: 10px 0;">No tasks in this list.</p>';
      return;
    }
    tasksGroup.forEach(task => {
      const item = document.createElement('div');
      item.className = `task-item ${task.completed ? 'completed' : ''}`;
      const catColor = getCategoryColor(task.category);
      
      item.innerHTML = `
        <div class="task-checkbox-container">
          <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="window.toggleTaskTrigger(${task.id}, this.checked)">
        </div>
        <div class="task-item-content">
          <div class="task-item-title">${task.title}</div>
          <div class="task-item-desc">${task.description || ''}</div>
          <div class="task-tags-row">
            <span class="task-badge badge-cat" style="--cat-color-rgb: ${catColor}">${task.category}</span>
            <span class="task-badge badge-duration">${task.estimatedDuration}m</span>
            ${task.dueDate ? `<span class="task-badge badge-due">Due: ${task.dueDate}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="task-btn" onclick="window.editTaskTrigger(${task.id})">
            <svg viewBox="0 0 24 24"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.07,6.19L3,17.25Z"/></svg>
          </button>
          <button class="task-btn btn-delete" onclick="window.deleteTaskTrigger(${task.id})">
            <svg viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
          </button>
        </div>
      `;
      domList.appendChild(item);
    });
  };

  renderList(dailyList, dailyTasks);
  renderList(weeklyList, weeklyTasks);
}

async function updateGrowthView() {
  const tasksList = await db.getAllTasks();
  const physicalList = document.getElementById('growth-physical-list');
  const mentalList = document.getElementById('growth-mental-list');

  physicalList.innerHTML = '';
  mentalList.innerHTML = '';

  const growthTasks = tasksList.filter(t => t.isRecurring);
  const physical = growthTasks.filter(t => t.category === 'Physical');
  const mental = growthTasks.filter(t => t.category === 'Mental');

  const formatRecurrence = (t) => {
    if (t.recurrenceType === 'daily') return 'Daily';
    if (t.recurrenceType === 'weekdays') return 'Weekdays Only';
    if (t.recurrenceType === 'weekly') return 'Weekly';
    if (t.recurrenceType === 'specific') {
      const daysMap = { '0':'Sun', '1':'Mon', '2':'Tue', '3':'Wed', '4':'Thu', '5':'Fri', '6':'Sat' };
      return 'Days: ' + t.recurrenceDays.map(d => daysMap[d]).join(', ');
    }
    return '';
  };

  const renderGrowthList = (domList, group) => {
    if (group.length === 0) {
      domList.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem; padding: 10px 0;">No habits scheduled.</p>';
      return;
    }
    group.forEach(task => {
      const item = document.createElement('div');
      item.className = 'task-item';
      item.innerHTML = `
        <div class="task-item-content">
          <div class="task-item-title">${task.title}</div>
          <div class="task-tags-row">
            <span class="task-badge badge-duration">${task.estimatedDuration}m</span>
            <span class="task-badge badge-cat" style="--cat-color-rgb: 46, 125, 50">${formatRecurrence(task)}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="task-btn" onclick="window.editGrowthTrigger(${task.id})">
            <svg viewBox="0 0 24 24"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.07,6.19L3,17.25Z"/></svg>
          </button>
          <button class="task-btn btn-delete" onclick="window.deleteTaskTrigger(${task.id})">
            <svg viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
          </button>
        </div>
      `;
      domList.appendChild(item);
    });
  };

  renderGrowthList(physicalList, physical);
  renderGrowthList(mentalList, mental);
}

async function updateAchievementsView() {
  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
  if (!profile.username) return;

  document.getElementById('gamify-level').textContent = profile.level || 1;
  document.getElementById('gamify-xp').textContent = profile.xp || 0;
  document.getElementById('gamify-streak').textContent = `${profile.currentStreak || 0} days`;

  const achievements = await db.getAllAchievements();
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  document.getElementById('gamify-badges').textContent = `${unlockedCount} / ${achievements.length}`;

  const badgesGrid = document.getElementById('achievements-grid-list');
  badgesGrid.innerHTML = '';

  const badgesIcons = {
    first_session: '📖',
    hours_10: '📚',
    hours_50: '🎓',
    hours_100: '👑',
    streak_7: '🔥',
    streak_30: '⚡',
    streak_365: '🌟',
    task_master: '🎯',
    consistency_champion: '🏆',
    academic_sprout: '🌱',
    focus_champion: '💎'
  };

  achievements.forEach(ach => {
    const card = document.createElement('div');
    card.className = `card achievement-card ${ach.unlocked ? 'unlocked' : ''}`;
    
    const icon = badgesIcons[ach.id] || '🌟';
    card.innerHTML = `
      <div class="achievement-badge">${icon}</div>
      <div class="achievement-info">
        <span class="achievement-name">${ach.name}</span>
        <span class="achievement-desc">${ach.desc}</span>
        ${ach.unlocked && ach.unlockDate ? `<span style="font-size:0.7rem; color:var(--text-muted); margin-top:4px;">Unlocked: ${new Date(ach.unlockDate).toLocaleDateString()}</span>` : ''}
      </div>
    `;
    badgesGrid.appendChild(card);
  });

  renderCalendar();
}

async function renderCalendar() {
  const gridDays = document.getElementById('calendar-grid-days');
  const monthYearLabel = document.getElementById('calendar-month-year');
  if (!gridDays) return;

  gridDays.innerHTML = '';

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  monthYearLabel.textContent = `${monthNames[currentCalendarMonth]} ${currentCalendarYear}`;

  const monthStats = await gamify.getMonthStatistics(currentCalendarYear, currentCalendarMonth);
  document.getElementById('calendar-stat-green').textContent = monthStats.green;
  document.getElementById('calendar-stat-yellow').textContent = monthStats.yellow;
  document.getElementById('calendar-stat-orange').textContent = monthStats.orange;
  document.getElementById('calendar-stat-red').textContent = monthStats.red;
  document.getElementById('calendar-stat-longest-streak').textContent = `${monthStats.longestStreak} days`;
  document.getElementById('calendar-stat-completion-rate').textContent = `${monthStats.completionRate}%`;

  const daysHeader = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  daysHeader.forEach(h => {
    const dh = document.createElement('div');
    dh.className = 'calendar-day-header';
    dh.textContent = h;
    gridDays.appendChild(dh);
  });

  const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1);
  let startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  for (let i = 0; i < startOffset; i++) {
    const space = document.createElement('div');
    space.className = 'calendar-cell-empty';
    gridDays.appendChild(space);
  }

  const daysInMonth = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const checkDate = new Date(currentCalendarYear, currentCalendarMonth, d);
    const offset = checkDate.getTimezoneOffset();
    const localDate = new Date(checkDate.getTime() - (offset * 60 * 1000));
    const dateStr = localDate.toISOString().split('T')[0];

    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    cell.innerHTML = `<span class="calendar-cell-date">${d}</span>`;

    const performance = await gamify.getDayPerformance(dateStr);
    if (performance.rating !== 'empty') {
      cell.classList.add(`rating-${performance.rating}`);
      const dot = document.createElement('div');
      dot.className = 'calendar-cell-dot';
      cell.appendChild(dot);
    }

    cell.addEventListener('click', () => {
      openCalendarDetailModal(dateStr, performance);
    });

    gridDays.appendChild(cell);
  }
}

function openCalendarDetailModal(dateStr, stats) {
  const overlay = document.getElementById('modal-calendar-detail');
  if (!overlay) return;

  const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  document.getElementById('cal-detail-date').textContent = formattedDate;
  
  const ratingEl = document.getElementById('cal-detail-rating');
  ratingEl.textContent = `Rating: ${stats.rating.toUpperCase()}`;
  ratingEl.className = `tag rating-${stats.rating}`;
  
  if (stats.rating === 'green') {
    ratingEl.style.backgroundColor = 'var(--day-green)';
    ratingEl.style.color = 'white';
  } else if (stats.rating === 'yellow') {
    ratingEl.style.backgroundColor = 'var(--day-yellow)';
    ratingEl.style.color = '#332200';
  } else if (stats.rating === 'orange') {
    ratingEl.style.backgroundColor = 'var(--day-orange)';
    ratingEl.style.color = 'white';
  } else if (stats.rating === 'red') {
    ratingEl.style.backgroundColor = 'var(--day-red)';
    ratingEl.style.color = 'white';
  } else {
    ratingEl.style.backgroundColor = 'var(--text-muted)';
    ratingEl.style.color = 'white';
  }

  document.getElementById('cal-detail-tasks-completed').textContent = `${stats.completed} / ${stats.total}`;
  document.getElementById('cal-detail-tasks-missed').textContent = stats.missed;
  
  const hours = Math.floor(stats.studyTime / 60);
  const mins = stats.studyTime % 60;
  document.getElementById('cal-detail-study-time').textContent = `${hours}h ${mins}m`;

  const recoveryEl = document.getElementById('cal-detail-recovery-message');
  if (stats.rating === 'red') {
    recoveryEl.style.display = 'block';
  } else {
    recoveryEl.style.display = 'none';
  }

  overlay.classList.add('active');
}

async function updateAnalyticsView() {
  const sessions = await db.getAllSessions();
  const tasksList = await db.getAllTasks();
  const xpLogs = await db.getAllXPLogs();

  const timeframe = document.getElementById('chart-timeframe-select').value || 'daily';
  
  charts.drawStudyHoursChart(sessions, timeframe);
  charts.drawSubjectPieChart(sessions);
  charts.drawXPProgressChart(xpLogs);
  charts.drawTaskCompletionChart(tasksList);
}

async function updateSettingsView() {
  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
  if (!profile.username) return;

  document.getElementById('profile-username').textContent = profile.username;
  document.getElementById('profile-join-date').textContent = `Member since: ${new Date(profile.joinDate).toLocaleDateString()}`;

  const avatarKey = profile.avatar || 'sprout';
  const avatarImgMap = {
    sprout: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232e7d32'><path d='M12 2C11.5 2 10 3 10 5.5C10 7.5 11.5 9 12 9.5C12.5 9 14 7.5 14 5.5C14 3 12.5 2 12 2M12 9.5V22H10V14.5C8 14.5 5 13 5 10C5 7.5 7.5 7.5 8 7.5C8.5 7.5 10 8 10 10.5C10 12.5 11.5 14 12 14.5'/></svg>",
    acorn: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%238d6e63'><path d='M12,2A3,3 0 0,1 15,5V6H9V5A3,3 0 0,1 12,2M19,8A7,7 0 0,1 12,15A7,7 0 0,1 5,8V7H19V8M12,16A4,4 0 0,0 16,12V11H8V12A4,4 0 0,0 12,16Z'/></svg>",
    ladybug: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23d32f2f'><path d='M12,2A8,8 0 0,1 20,10C20,14.42 16.42,18 12,18C7.58,18 4,14.42 4,10A8,8 0 0,1 12,2M12,4A6,6 0 0,0 6,10H18A6,6 0 0,0 12,4M12,11A1,1 0 0,1 13,12A1,1 0 0,1 12,13A1,1 0 0,1 11,12A1,1 0 0,1 12,11M16,13A1,1 0 0,1 17,14A1,1 0 0,1 16,15A1,1 0 0,1 15,14A1,1 0 0,1 16,13M8,13A1,1 0 0,1 9,14A1,1 0 0,1 8,15A1,1 0 0,1 7,14A1,1 0 0,1 8,13Z'/></svg>",
    leaf: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234caf50'><path d='M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L7.38,17.8C9.5,18.8 12,18.8 14.2,17.8L15.8,22L17.7,21.3L15.6,16C17.7,14 18.8,11 17,8Z'/></svg>",
    mushroom: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23fb923c'><path d='M12,2A10,10 0 0,0 2,12H6A1,1 0 0,0 7,13V20A2,2 0 0,0 9,22H15A2,2 0 0,0 17,20V13A1,1 0 0,0 18,12H22A10,10 0 0,0 12,2M12,4A8,8 0 0,1 19.9,10H4.1A8,8 0 0,1 12,4Z'/></svg>",
    flower: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ba68c8'><path d='M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M6,12A2,2 0 0,1 8,10A2,2 0 0,1 10,12A2,2 0 0,1 8,14A2,2 0 0,1 6,12M12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20M18,12A2,2 0 0,1 16,14A2,2 0 0,1 14,12A2,2 0 0,1 16,10A2,2 0 0,1 18,12Z'/></svg>"
  };
  document.getElementById('profile-img').src = avatarImgMap[avatarKey];

  const tagsContainer = document.getElementById('profile-interests-tags');
  tagsContainer.innerHTML = '';
  const interests = profile.interests || [];
  interests.forEach(tag => {
    const t = document.createElement('span');
    t.className = 'tag';
    t.textContent = tag;
    tagsContainer.appendChild(t);
  });

  const ghLink = document.getElementById('profile-github-link');
  const liLink = document.getElementById('profile-linkedin-link');
  const igLink = document.getElementById('profile-instagram-link');

  ghLink.innerHTML = profile.githubUrl
    ? `😺 GitHub: <a href="${profile.githubUrl}" target="_blank" style="color:var(--primary); font-weight:600;">${profile.githubUrl}</a>`
    : '😺 GitHub: <em>Not Linked</em>';
  liLink.innerHTML = profile.linkedinUrl
    ? `💼 LinkedIn: <a href="${profile.linkedinUrl}" target="_blank" style="color:var(--primary); font-weight:600;">${profile.linkedinUrl}</a>`
    : '💼 LinkedIn: <em>Not Linked</em>';
  igLink.innerHTML = profile.instagramUrl
    ? `📸 Instagram: <a href="${profile.instagramUrl}" target="_blank" style="color:var(--primary); font-weight:600;">${profile.instagramUrl}</a>`
    : '📸 Instagram: <em>Not Linked</em>';

  document.getElementById('pref-pomo-duration').value = profile.pomoDuration || 25;
  document.getElementById('pref-break-duration').value = profile.breakDuration || 5;
  document.getElementById('pref-sound-enabled').checked = profile.soundEnabled !== false;
  document.getElementById('pref-auto-break').checked = profile.autoBreak !== false;

  const dndContainer = document.getElementById('pref-dnd-container');
  if (window.AndroidInterface) {
    if (dndContainer) dndContainer.style.display = 'flex';
    const isDndEnabled = localStorage.getItem('personal_study_os_pref_dnd') === 'true';
    document.getElementById('pref-dnd-enabled').checked = isDndEnabled;
    
    const permissionBtn = document.getElementById('pref-dnd-permission-btn');
    if (permissionBtn) {
      const hasPermission = window.AndroidInterface.hasDndPermission();
      if (hasPermission) {
        permissionBtn.textContent = 'Granted';
        permissionBtn.disabled = true;
      } else {
        permissionBtn.textContent = 'Grant Permission';
        permissionBtn.disabled = false;
        permissionBtn.onclick = () => {
          window.AndroidInterface.requestDndPermission();
        };
      }
    }
  } else {
    if (dndContainer) dndContainer.style.display = 'none';
  }

  const remSettingsList = document.getElementById('reminders-settings-list');
  remSettingsList.innerHTML = '';
  const reminders = await db.getAllReminders();

  if (reminders.length === 0) {
    remSettingsList.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No account reminders created yet.</p>';
  } else {
    reminders.forEach(rem => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '10px';
      row.style.background = 'rgba(var(--primary-rgb), 0.04)';
      row.style.borderRadius = 'var(--radius-sm)';

      const freqLabel = rem.frequency === 'custom' ? `Every ${rem.customDays} days` : rem.frequency;
      
      row.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:4px;">
          <span style="font-weight:600; font-size:0.95rem;">${rem.label}</span>
          <span style="font-size:0.75rem; color:var(--text-muted);">${freqLabel.toUpperCase()} | URL: ${rem.url || 'None'}</span>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary" onclick="window.completeReminderTrigger(${rem.id})" style="padding:6px 10px; font-size:0.8rem;">
            Check/Done
          </button>
          <button class="task-btn btn-delete" onclick="window.deleteReminderTrigger(${rem.id})" style="padding:6px; color:var(--day-red);">
            <svg viewBox="0 0 24 24" style="width: 14px; height: 14px;"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
          </button>
        </div>
      `;
      remSettingsList.appendChild(row);
    });
  }

  const historyList = document.getElementById('profile-reminders-list');
  historyList.innerHTML = '';
  let count = 0;

  reminders.forEach(rem => {
    if (rem.history && rem.history.length > 0) {
      rem.history.forEach(logDate => {
        count++;
        const item = document.createElement('div');
        item.className = 'reminder-history-item';
        item.innerHTML = `
          <span>Checked <strong>${rem.label}</strong></span>
          <span style="color:var(--text-muted);">${new Date(logDate).toLocaleString()}</span>
        `;
        historyList.appendChild(item);
      });
    }
  });

  if (count === 0) {
    historyList.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; font-style:italic;">No reminder completion logs available.</p>';
  }
}

async function handleOnboardingSubmit(appControllerCallbacks) {
  const username = document.getElementById('onboard-username').value.trim();
  const selectedAvatar = document.querySelector('.avatar-option.selected').dataset.avatar;
  const interestsRaw = document.getElementById('onboard-interests').value;
  const github = document.getElementById('onboard-github').value.trim();
  const linkedin = document.getElementById('onboard-linkedin').value.trim();
  const instagram = document.getElementById('onboard-instagram').value.trim();

  const interests = interestsRaw 
    ? interestsRaw.split(',').map(s => s.trim()).filter(s => s.length > 0)
    : [];

  const profile = {
    username,
    avatar: selectedAvatar,
    interests,
    githubUrl: github,
    linkedinUrl: linkedin,
    instagramUrl: instagram,
    joinDate: new Date().toISOString(),
    xp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    theme: 'light',
    pomoDuration: 25,
    breakDuration: 5,
    soundEnabled: true,
    autoBreak: true,
    subjects: [
      { id: 'sub_math', name: 'Mathematics', color: '#3f51b5' },
      { id: 'sub_prog', name: 'Programming', color: '#22c55e' }
    ]
  };

  localStorage.setItem('personal_study_os_profile', JSON.stringify(profile));

  if (document.getElementById('reminder-github-contribution').checked) {
    await db.addReminder({ label: 'GitHub Contribution', url: github || 'https://github.com', frequency: 'daily', history: [] });
  }
  if (document.getElementById('reminder-linkedin-check').checked) {
    await db.addReminder({ label: 'LinkedIn Network Check', url: linkedin || 'https://linkedin.com', frequency: 'weekly', history: [] });
  }
  if (document.getElementById('reminder-instagram-post').checked) {
    await db.addReminder({ label: 'Instagram Feed Review', url: instagram || 'https://instagram.com', frequency: 'weekly', history: [] });
  }

  await gamify.addXP(50, 'Completed Onboarding setup');

  document.getElementById('onboarding-container').classList.remove('active');
  
  if (appControllerCallbacks && appControllerCallbacks.onOnboardingDone) {
    appControllerCallbacks.onOnboardingDone();
  }
}

function handleSubjectSubmit(appControllerCallbacks) {
  const id = document.getElementById('modal-subject-id').value;
  const name = document.getElementById('subject-name').value.trim();
  const color = document.getElementById('subject-color').value;

  try {
    if (id) {
      tasks.editSubject(id, name, color);
    } else {
      tasks.addSubject(name, color);
    }
    closeModal('modal-subject');
    
    if (appControllerCallbacks && appControllerCallbacks.onDataChanged) {
      appControllerCallbacks.onDataChanged();
    }
  } catch (err) {
    alert(err.message);
  }
}

async function handleTaskSubmit(appControllerCallbacks) {
  const id = document.getElementById('modal-task-id').value;
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const category = document.getElementById('task-category').value;
  const estimatedDuration = parseInt(document.getElementById('task-duration').value) || 30;
  const dueDate = document.getElementById('task-due').value;
  const scope = document.getElementById('task-type').value;

  const data = { title, description, category, estimatedDuration, dueDate, scope };

  if (id) {
    const tasksList = await db.getAllTasks();
    const t = tasksList.find(x => x.id === parseInt(id));
    if (t) {
      Object.assign(t, data);
      await db.updateTask(t);
    }
  } else {
    await tasks.createTarget(data);
  }

  closeModal('modal-task');
  if (appControllerCallbacks && appControllerCallbacks.onDataChanged) {
    appControllerCallbacks.onDataChanged();
  }
}

async function handleGrowthSubmit(appControllerCallbacks) {
  const id = document.getElementById('modal-growth-id').value;
  const title = document.getElementById('growth-title').value.trim();
  const category = document.getElementById('growth-category').value;
  const estimatedDuration = parseInt(document.getElementById('growth-duration').value) || 15;
  const recurrenceType = document.getElementById('growth-recurrence').value;

  const daysCheckboxes = document.querySelectorAll('input[name="growth-days"]:checked');
  const recurrenceDays = Array.from(daysCheckboxes).map(c => parseInt(c.value));

  const data = { title, category, estimatedDuration, recurrenceType, recurrenceDays };

  if (id) {
    const tasksList = await db.getAllTasks();
    const t = tasksList.find(x => x.id === parseInt(id));
    if (t) {
      Object.assign(t, data);
      t.isRecurring = true;
      await db.updateTask(t);
    }
  } else {
    await tasks.createGrowthHabit(data);
  }

  await tasks.instantiateRecurringHabits();

  closeModal('modal-growth');
  if (appControllerCallbacks && appControllerCallbacks.onDataChanged) {
    appControllerCallbacks.onDataChanged();
  }
}

async function handleReminderSubmit(appControllerCallbacks) {
  const label = document.getElementById('reminder-label').value.trim();
  const url = document.getElementById('reminder-url').value.trim();
  const frequency = document.getElementById('reminder-frequency').value;
  const customDays = parseInt(document.getElementById('reminder-custom-days').value) || 3;

  const data = { label, url, frequency, customDays, history: [] };
  await db.addReminder(data);
  
  closeModal('modal-reminder');
  if (appControllerCallbacks && appControllerCallbacks.onDataChanged) {
    appControllerCallbacks.onDataChanged();
  }
}

function handlePreferencesSubmit() {
  const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
  profile.pomoDuration = parseInt(document.getElementById('pref-pomo-duration').value) || 25;
  profile.breakDuration = parseInt(document.getElementById('pref-break-duration').value) || 5;
  profile.soundEnabled = document.getElementById('pref-sound-enabled').checked;
  profile.autoBreak = document.getElementById('pref-auto-break').checked;

  localStorage.setItem('personal_study_os_profile', JSON.stringify(profile));

  if (window.AndroidInterface) {
    const dndChecked = document.getElementById('pref-dnd-enabled').checked;
    localStorage.setItem('personal_study_os_pref_dnd', dndChecked ? 'true' : 'false');
  }

  alert('Preferences saved successfully!');
}

function openSubjectModal(id = '') {
  document.getElementById('modal-subject-id').value = id;
  const form = document.getElementById('modal-subject-form');
  form.reset();

  if (id) {
    document.getElementById('subject-modal-title').textContent = 'Edit Subject';
    document.getElementById('subject-submit-btn').textContent = 'Update Subject';
    const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
    const subjectsList = profile.subjects || [];
    const sub = subjectsList.find(s => s.id === id);
    if (sub) {
      document.getElementById('subject-name').value = sub.name;
      document.getElementById('subject-color').value = sub.color;
    }
  } else {
    document.getElementById('subject-modal-title').textContent = 'Create New Subject';
    document.getElementById('subject-submit-btn').textContent = 'Create Subject';
  }

  document.getElementById('modal-subject').classList.add('active');
}

function openTaskModal(id = '') {
  document.getElementById('modal-task-id').value = id;
  const form = document.getElementById('modal-task-form');
  form.reset();

  document.getElementById('task-due').value = new Date().toISOString().split('T')[0];

  if (id) {
    document.getElementById('task-modal-title').textContent = 'Edit Target';
    document.getElementById('task-submit-btn').textContent = 'Update Target';
    db.getAllTasks().then(tasksList => {
      const task = tasksList.find(t => t.id === id);
      if (task) {
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-desc').value = task.description || '';
        document.getElementById('task-category').value = task.category;
        document.getElementById('task-duration').value = task.estimatedDuration;
        document.getElementById('task-due').value = task.dueDate;
        document.getElementById('task-type').value = task.scope;
      }
    });
  } else {
    document.getElementById('task-modal-title').textContent = 'Create Daily Target';
    document.getElementById('task-submit-btn').textContent = 'Add Target';
  }

  document.getElementById('modal-task').classList.add('active');
}

function openGrowthModal(id = '') {
  document.getElementById('modal-growth-id').value = id;
  const form = document.getElementById('modal-growth-form');
  form.reset();
  document.getElementById('growth-specific-days-panel').style.display = 'none';

  if (id) {
    document.getElementById('growth-modal-title').textContent = 'Edit Growth Task';
    document.getElementById('growth-submit-btn').textContent = 'Update Habit';
    db.getAllTasks().then(tasksList => {
      const task = tasksList.find(t => t.id === id);
      if (task) {
        document.getElementById('growth-title').value = task.title;
        document.getElementById('growth-category').value = task.category;
        document.getElementById('growth-duration').value = task.estimatedDuration;
        document.getElementById('growth-recurrence').value = task.recurrenceType;
        
        if (task.recurrenceType === 'specific') {
          document.getElementById('growth-specific-days-panel').style.display = 'block';
          const checkboxes = document.querySelectorAll('input[name="growth-days"]');
          checkboxes.forEach(c => {
            c.checked = task.recurrenceDays.includes(parseInt(c.value));
          });
        }
      }
    });
  } else {
    document.getElementById('growth-modal-title').textContent = 'Create Growth Task';
    document.getElementById('growth-submit-btn').textContent = 'Create Habit';
  }

  document.getElementById('modal-growth').classList.add('active');
}

function openReminderModal() {
  const form = document.getElementById('modal-reminder-form');
  form.reset();
  document.getElementById('reminder-custom-days-container').style.display = 'none';
  document.getElementById('modal-reminder').classList.add('active');
}

function getCategoryColor(cat) {
  const map = {
    Study: '63, 81, 181',
    Physical: '255, 152, 0',
    Mental: '156, 39, 176',
    Personal: '121, 85, 72',
    'Social Media Update': '233, 30, 99'
  };
  return map[cat] || '46, 125, 50';
}

// UI Namespace Object
const ui = {
  initUI,
  switchView,
  toggleTheme,
  loadThemePreference,
  updateDashboardView,
  updateTargetsView,
  updateGrowthView,
  updateAchievementsView,
  renderCalendar,
  openCalendarDetailModal,
  updateAnalyticsView,
  updateSettingsView,
  handleOnboardingSubmit,
  handleSubjectSubmit,
  handleTaskSubmit,
  handleGrowthSubmit,
  handleReminderSubmit,
  handlePreferencesSubmit,
  openSubjectModal,
  openTaskModal,
  openGrowthModal,
  openReminderModal,
  getCategoryColor
};

// =========================================================================
// 8. APP COORDINATOR COMPONENT (Formerly app.js)
// =========================================================================

async function initializeApp() {
  try {
    await db.initDB();
    console.log('Database initialized successfully.');

    setupGlobalWindowBindings();

    ui.initUI({
      onOnboardingDone: async () => {
        await tasks.instantiateRecurringHabits();
        await ui.switchView('dashboard');
      },
      onDataChanged: async () => {
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav) {
          const currentView = activeNav.dataset.view;
          await ui.switchView(currentView);
        }
      }
    });

    timers.initTimers({
      onSessionLogged: async (xpResult) => {
        console.log('Session logged. XP result:', xpResult);
        
        if (xpResult && xpResult.leveledUp) {
          alert(`🎉 LEVEL UP! You reached Level ${xpResult.level}! Keep growing!`);
        }

        if (xpResult && xpResult.unlockedBadges && xpResult.unlockedBadges.length > 0) {
          alert(`🏆 ACHIEVEMENT UNLOCKED:\n${xpResult.unlockedBadges.join('\n')}`);
        }

        await ui.updateDashboardView();
      }
    });

    const profile = JSON.parse(localStorage.getItem('personal_study_os_profile') || '{}');
    if (!profile.username) {
      document.getElementById('onboarding-container').classList.add('active');
    } else {
      ui.loadThemePreference();
      await tasks.instantiateRecurringHabits();
      await ui.switchView('dashboard');
    }

  } catch (err) {
    console.error('Failed to initialize Study OS App:', err);
    alert('Failed to launch application database: ' + err.message);
  }
}

function setupGlobalWindowBindings() {
  window.handleAndroidBack = () => {
    const focusOverlay = document.getElementById('focus-overlay');
    if (focusOverlay && focusOverlay.classList.contains('active')) {
      const confirmStop = confirm("Are you sure you want to stop and log your current focus session?");
      if (confirmStop) {
        timers.stopAndLogTimer({
          onSessionLogged: async (xpResult) => {
            if (xpResult && xpResult.leveledUp) {
              alert(`🎉 LEVEL UP! You reached Level ${xpResult.level}! Keep growing!`);
            }
            if (xpResult && xpResult.unlockedBadges && xpResult.unlockedBadges.length > 0) {
              alert(`🏆 ACHIEVEMENT UNLOCKED:\n${xpResult.unlockedBadges.join('\n')}`);
            }
            await ui.updateDashboardView();
          }
        });
        return true;
      }
      return true;
    }

    const activeModal = document.querySelector('.modal-overlay.active');
    if (activeModal) {
      activeModal.classList.remove('active');
      return true;
    }

    const onboarding = document.getElementById('onboarding-container');
    if (onboarding && onboarding.classList.contains('active')) {
      return true;
    }

    return false;
  };

  window.toggleTaskTrigger = async (id, checked) => {
    await tasks.toggleTaskCompletion(id, checked, {
      onXPChanged: (xpResult) => {
        if (xpResult && xpResult.leveledUp) {
          alert(`🎉 LEVEL UP! You reached Level ${xpResult.level}! Keep growing!`);
        }
        if (xpResult && xpResult.unlockedBadges && xpResult.unlockedBadges.length > 0) {
          alert(`🏆 ACHIEVEMENT UNLOCKED:\n${xpResult.unlockedBadges.join('\n')}`);
        }
      }
    });

    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav) {
      await ui.switchView(activeNav.dataset.view);
    }
  };

  window.editSubjectTrigger = (id) => {
    ui.openSubjectModal(id);
  };

  window.deleteSubjectTrigger = async (id) => {
    if (confirm('Are you sure you want to delete this study subject? The historical logs will remain, but you won\'t be able to log new hours on it.')) {
      tasks.deleteSubject(id);
      await ui.updateDashboardView();
    }
  };

  window.editTaskTrigger = (id) => {
    ui.openTaskModal(id);
  };

  window.deleteTaskTrigger = async (id) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await tasks.removeTask(id);
      const activeNav = document.querySelector('.nav-item.active');
      if (activeNav) {
        await ui.switchView(activeNav.dataset.view);
      }
    }
  };

  window.editGrowthTrigger = (id) => {
    ui.openGrowthModal(id);
  };

  window.completeReminderTrigger = async (id) => {
    const reminders = await db.getAllReminders();
    const rem = reminders.find(r => r.id === id);
    if (rem) {
      const nowStr = new Date().toISOString();
      rem.lastCompleted = nowStr;
      if (!rem.history) rem.history = [];
      rem.history.push(nowStr);
      await db.updateReminder(rem);
      
      const xpResult = await gamify.addXP(10, `Completed Reminder check: ${rem.label}`);
      if (xpResult && xpResult.leveledUp) {
        alert(`🎉 LEVEL UP! You reached Level ${xpResult.level}! Keep growing!`);
      }
      
      alert(`Checked: ${rem.label}! Awarded +10 XP.`);

      if (rem.url) {
        window.open(rem.url, '_blank');
      }

      await ui.updateSettingsView();
    }
  };

  window.deleteReminderTrigger = async (id) => {
    if (confirm('Delete this account reminder?')) {
      await db.deleteReminder(id);
      await ui.updateSettingsView();
    }
  };
}

document.addEventListener('DOMContentLoaded', initializeApp);
