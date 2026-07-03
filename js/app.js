/**
 * StudyOS v5 - Main Application Controller
 * Handles routing, component lifecycle, theme switching, onboarding wizard,
 * modal triggers, and integration across database, timer, calendar, and gamification.
 */

import { initDB, onMultiTabLock, getByKey, putRecord, getAll, clearStore } from './db.js';
import { timerEngine, TIMER_MODES, TIMER_STATES } from './timerEngine.js';
import { awardXP, getLevelData, checkAchievements, ACHIEVEMENTS_DEF } from './gamification.js';
import { evaluateDayStatus, toISODateString, calculateStreak, toggleRestDay, getWeekRange, CALENDAR_STATUS } from './calendar.js';
import { downloadJSONBackup, restoreJSONBackupFile, exportSessionsCSV, exportTasksCSV, generatePDFReport } from './backup.js';
import { executeGlobalSearch } from './search.js';
import { renderStudyHoursBarChart, renderSubjectDistributionDonut, renderAnnualHeatmap } from './charts.js';

let currentPage = 'dashboard';
let userProfile = null;
let appSettings = null;
let selectedSubjectColor = '#2d6a4f';
let currentTaskFilter = 'all';

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initDB();
    console.log("[StudyOS] Database initialized successfully.");

    // Handle §3.4 Multi-tab Upgrade Lock
    onMultiTabLock(() => {
      const lockOverlay = document.getElementById('multi-tab-lock');
      if (lockOverlay) lockOverlay.style.display = 'flex';
    });

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn("[StudyOS PWA] Service Worker registration skipped:", err);
      });
    }

    // Load Settings & Theme
    appSettings = (await getByKey('settings', 'app_settings')) || {
      key: 'app_settings',
      dailyStudyGoalMinutes: 30,
      dailyTaskGoalCount: 3,
      preferredTimer: 'POMODORO',
      theme: 'light',
      highContrast: false,
      reducedMotion: false,
      reducedTransparency: false
    };

    applyThemeSettings(appSettings);

    // Check Profile
    userProfile = await getByKey('profile', 'user_profile');
    if (!userProfile) {
      renderOnboardingWizard();
    } else {
      initAppUI();
      checkCrashRecoveryPrompt();
    }

  } catch (err) {
    console.error("[StudyOS Init Error]", err);
    showToast("Initialization error: " + err.message, "error");
  }
});

function applyThemeSettings(settings) {
  document.documentElement.setAttribute('data-theme', settings.theme || 'light');
  if (settings.highContrast) document.documentElement.setAttribute('data-contrast', 'high');
  else document.documentElement.removeAttribute('data-contrast');

  if (settings.reducedMotion) document.documentElement.setAttribute('data-motion', 'reduced');
  else document.documentElement.removeAttribute('data-motion');

  if (settings.reducedTransparency) document.documentElement.setAttribute('data-transparency', 'reduced');
  else document.documentElement.removeAttribute('data-transparency');
}

/**
 * Toast Notification System
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `card`;
  toast.style.cssText = `
    padding: 12px 20px;
    font-size: 13px;
    font-weight: 600;
    border-left: 5px solid ${type === 'error' ? 'var(--accent-red)' : type === 'success' ? 'var(--primary-grass)' : 'var(--accent-gold)'};
    background: var(--card-solid-bg);
    box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    min-width: 250px;
  `;
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Sets up Main Application Event Listeners & UI Components
 */
function initAppUI() {
  setupNavigation();
  updateHeaderStats();
  setupTimerSubscriptions();
  setupGlobalSearch();
  setupModalForms();

  const todayStr = toISODateString();
  evaluateDayStatus(todayStr).then(() => updateHeaderStats());

  renderPage(currentPage);
}

/**
 * Header Stat Badge Update
 */
async function updateHeaderStats() {
  userProfile = await getByKey('profile', 'user_profile');
  if (!userProfile) return;

  const levelData = getLevelData(userProfile.totalXP || 0);
  const { currentStreak, longestStreak } = await calculateStreak();

  if (longestStreak > (userProfile.longestStreak || 0)) {
    userProfile.longestStreak = longestStreak;
    await putRecord('profile', userProfile);
  }

  const streakEl = document.getElementById('header-streak-count');
  const levelEl = document.getElementById('header-level-num');
  const xpEl = document.getElementById('header-xp-val');

  if (streakEl) streakEl.innerText = currentStreak;
  if (levelEl) levelEl.innerText = levelData.level;
  if (xpEl) xpEl.innerText = levelData.totalXP;
}

/**
 * Setup Navigation Routing
 */
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item, .bottom-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.getAttribute('data-page');
      if (page) {
        navItems.forEach(n => n.classList.remove('active'));
        document.querySelectorAll(`[data-page="${page}"]`).forEach(n => n.classList.add('active'));
        currentPage = page;
        renderPage(page);
      }
    });
  });

  const startStudyBtns = [
    document.getElementById('header-start-study-btn'),
    document.getElementById('mobile-fab-study')
  ];

  startStudyBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        currentPage = 'study';
        renderPage('study');
      });
    }
  });

  // Focus Mode buttons
  document.getElementById('exit-focus-btn')?.addEventListener('click', () => {
    document.getElementById('focus-mode-overlay').style.display = 'none';
  });

  document.getElementById('focus-pause-btn')?.addEventListener('click', () => {
    const status = timerEngine.getStatus();
    if (status.state === TIMER_STATES.RUNNING) {
      timerEngine.pause();
    } else if (status.state === TIMER_STATES.PAUSED) {
      timerEngine.resume();
    }
  });

  document.getElementById('focus-stop-btn')?.addEventListener('click', async () => {
    await handleStopTimerSession();
    document.getElementById('focus-mode-overlay').style.display = 'none';
  });
}

/**
 * Setup Custom Modal Handlers
 */
function setupModalForms() {
  const swatches = document.querySelectorAll('#modal-subj-colors .color-option');
  swatches.forEach(sw => {
    sw.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      selectedSubjectColor = sw.getAttribute('data-color') || '#2d6a4f';
    });
  });

  const subjModal = document.getElementById('subject-modal');
  const subjForm = document.getElementById('subject-modal-form');
  document.getElementById('close-subj-modal-btn')?.addEventListener('click', () => {
    if (subjModal) subjModal.style.display = 'none';
  });

  subjForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('modal-subj-title').value.trim();
    if (!title) return;

    const newSubj = {
      id: 'subj_' + Date.now(),
      moduleType: 'STUDY',
      title,
      color: selectedSubjectColor,
      createdTimestamp: Date.now(),
      archived: false,
      metadata: { notes: '' },
      schemaVersion: 1
    };

    await putRecord('subjects', newSubj);
    showToast(`Subject "${title}" created!`, "success");
    if (subjModal) subjModal.style.display = 'none';
    subjForm.reset();
    renderPage(currentPage);
  });

  const taskModal = document.getElementById('task-modal');
  const taskForm = document.getElementById('task-modal-form');
  document.getElementById('close-task-modal-btn')?.addEventListener('click', () => {
    if (taskModal) taskModal.style.display = 'none';
  });

  taskForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('modal-task-title').value.trim();
    if (!title) return;

    const category = document.getElementById('modal-task-category').value;
    const priority = document.getElementById('modal-task-priority').value;
    const dateInput = document.getElementById('modal-task-date').value;
    const recurring = document.getElementById('modal-task-recurring').value;

    const newTask = {
      id: 'task_' + Date.now(),
      title,
      category,
      priority,
      dueDate: dateInput || toISODateString(),
      completed: false,
      recurring,
      schemaVersion: 1
    };

    await putRecord('tasks', newTask);
    showToast("New task created!", "success");
    if (taskModal) taskModal.style.display = 'none';
    taskForm.reset();
    renderPage(currentPage);
  });
}

/**
 * Timer Engine State Subscriptions
 */
function setupTimerSubscriptions() {
  timerEngine.subscribe((status) => {
    const formatDigits = (secs) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const digitsText = status.mode === TIMER_MODES.STOPWATCH 
      ? formatDigits(status.elapsedSeconds)
      : formatDigits(status.remainingSeconds);

    const focusDigits = document.getElementById('focus-digits');
    const dashDigits = document.getElementById('dash-timer-digits');
    const focusPauseBtn = document.getElementById('focus-pause-btn');

    if (focusDigits) focusDigits.innerText = digitsText;
    if (dashDigits) dashDigits.innerText = digitsText;
    if (focusPauseBtn) {
      focusPauseBtn.innerText = status.state === TIMER_STATES.RUNNING ? 'Pause' : 'Resume';
    }

    updateDashboardTimerControls(status);

    if (status.state === TIMER_STATES.RUNNING) {
      document.title = `(${digitsText}) StudyOS`;
    } else {
      document.title = `StudyOS — Personal Productivity`;
    }

    if (status.isClockTampered) {
      showToast("Clock change detected — session paused automatically.", "error");
    }

    if (status.state === TIMER_STATES.FINISHED) {
      showToast("Timer completed!", "success");
      handleStopTimerSession();
    }
  });
}

/**
 * Dynamically updates Dashboard Timer Card Controls
 */
function updateDashboardTimerControls(status) {
  const container = document.getElementById('dash-timer-controls-box');
  if (!container) return;

  if (status.state === TIMER_STATES.IDLE) {
    container.innerHTML = `
      <button class="btn-primary" id="dash-start-btn">Start Session</button>
      <button class="btn-secondary" id="dash-focus-btn">Focus Mode 🎯</button>
    `;
  } else if (status.state === TIMER_STATES.RUNNING) {
    container.innerHTML = `
      <button class="btn-secondary" id="dash-pause-btn">Pause</button>
      <button class="btn-danger" id="dash-stop-btn">Stop & Save Session</button>
      <button class="btn-secondary" id="dash-focus-btn">Focus Mode 🎯</button>
    `;
  } else if (status.state === TIMER_STATES.PAUSED) {
    container.innerHTML = `
      <button class="btn-primary" id="dash-resume-btn">Resume</button>
      <button class="btn-danger" id="dash-stop-btn">Stop & Save Session</button>
      <button class="btn-secondary" id="dash-focus-btn">Focus Mode 🎯</button>
    `;
  }

  document.getElementById('dash-start-btn')?.addEventListener('click', () => {
    const subjId = document.getElementById('dash-subject-select')?.value;
    const mode = document.getElementById('dash-mode-select')?.value;
    if (!subjId) {
      showToast("Please create a study subject first!", "error");
      return;
    }
    timerEngine.start(subjId, mode, mode === 'POMODORO' ? 25 : 50);
    showToast("Study session started!", "success");
  });

  document.getElementById('dash-pause-btn')?.addEventListener('click', () => timerEngine.pause());
  document.getElementById('dash-resume-btn')?.addEventListener('click', () => timerEngine.resume());
  document.getElementById('dash-stop-btn')?.addEventListener('click', () => handleStopTimerSession());
  document.getElementById('dash-focus-btn')?.addEventListener('click', () => {
    document.getElementById('focus-mode-overlay').style.display = 'flex';
  });
}

/**
 * Handles completing/stopping a timer session
 */
async function handleStopTimerSession() {
  const result = timerEngine.stop();
  if (!result.isValid) {
    showToast("Study session shorter than 60s ignored.", "info");
    return;
  }

  const sessionRecord = {
    id: 'session_' + Date.now(),
    subjectId: result.subjectId,
    startTimestamp: result.startTimestamp,
    endTimestamp: result.endTimestamp,
    durationSeconds: result.elapsedSeconds,
    sessionType: result.mode,
    schemaVersion: 1
  };

  const xpResult = await awardXP('STUDY_SESSION', { durationSeconds: result.elapsedSeconds });
  sessionRecord.xpEarned = xpResult.amount;

  await putRecord('sessions', sessionRecord);

  const todayStr = toISODateString();
  const settings = (await getByKey('settings', 'app_settings')) || {};
  const sessions = await getAll('sessions');
  const todayStudyMins = Math.floor(sessions.filter(s => toISODateString(s.startTimestamp) === todayStr).reduce((acc, s) => acc + s.durationSeconds, 0) / 60);

  if (todayStudyMins >= (settings.dailyStudyGoalMinutes || 30)) {
    await awardXP('DAILY_STUDY_GOAL_HIT');
  }

  await evaluateDayStatus(todayStr);
  const newlyUnlocked = await checkAchievements();

  if (newlyUnlocked.length > 0) {
    newlyUnlocked.forEach(ach => showToast(`🏆 Achievement Unlocked: ${ach.title}!`, "success"));
  } else {
    showToast(`Session saved! +${xpResult.amount} XP earned.`, "success");
  }

  await updateHeaderStats();
  renderPage(currentPage);
}

/**
 * Setup Global Search Modal Trigger
 */
function setupGlobalSearch() {
  const modal = document.getElementById('search-modal');
  const trigger = document.getElementById('trigger-search-btn');
  const closeBtn = document.getElementById('close-search-btn');
  const input = document.getElementById('global-search-input');
  const resultsContainer = document.getElementById('search-results-container');

  const openSearch = () => {
    if (modal) {
      modal.style.display = 'flex';
      input.focus();
    }
  };

  const closeSearch = () => {
    if (modal) modal.style.display = 'none';
  };

  trigger?.addEventListener('click', openSearch);
  closeBtn?.addEventListener('click', closeSearch);

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  });

  input?.addEventListener('input', async (e) => {
    const q = e.target.value;
    const res = await executeGlobalSearch(q);
    
    if (!q.trim()) {
      resultsContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">Type a query to search StudyOS...</div>`;
      return;
    }

    let html = '';
    if (res.subjects.length > 0) {
      html += `<div style="font-weight:700; margin:10px 0; color:var(--primary-grass);">Subjects</div>`;
      res.subjects.forEach(s => {
        html += `<div class="card" style="padding:10px; margin-bottom:6px;"><strong>${s.title}</strong></div>`;
      });
    }

    if (res.tasks.length > 0) {
      html += `<div style="font-weight:700; margin:10px 0; color:var(--primary-grass);">Tasks</div>`;
      res.tasks.forEach(t => {
        html += `<div class="card" style="padding:10px; margin-bottom:6px;"><strong>${t.title}</strong> (${t.category})</div>`;
      });
    }

    resultsContainer.innerHTML = html || `<div style="text-align:center; padding:20px; color:var(--text-muted);">No results found.</div>`;
  });
}

/**
 * Main Page Renderer Router
 */
async function renderPage(page) {
  const container = document.getElementById('page-content');
  if (!container) return;

  switch (page) {
    case 'dashboard':
      renderDashboardPage(container);
      break;
    case 'study':
      renderStudyPage(container);
      break;
    case 'tasks':
      renderTasksPage(container);
      break;
    case 'growth':
      renderGrowthPage(container);
      break;
    case 'reminders':
      renderRemindersPage(container);
      break;
    case 'analytics':
      renderAnalyticsPage(container);
      break;
    case 'profile':
      renderProfilePage(container);
      break;
    default:
      renderDashboardPage(container);
  }
}

/**
 * 1. Dashboard View
 */
async function renderDashboardPage(container) {
  const [subjects, sessions, tasks, calendarDays] = await Promise.all([
    getAll('subjects'),
    getAll('sessions'),
    getAll('tasks'),
    getAll('calendar_days')
  ]);

  const activeSubjects = subjects.filter(s => !s.archived);
  const todayStr = toISODateString();
  const todaySessions = sessions.filter(s => toISODateString(s.startTimestamp) === todayStr);
  const todayTasks = tasks.filter(t => t.dueDate === todayStr);

  const todayStudySecs = todaySessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const todayHours = (todayStudySecs / 3600).toFixed(1);

  const levelData = getLevelData(userProfile?.totalXP || 0);

  const timerStatus = timerEngine.getStatus();
  const formatDigits = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  const timerDigits = timerStatus.state !== TIMER_STATES.IDLE
    ? (timerStatus.mode === TIMER_MODES.STOPWATCH ? formatDigits(timerStatus.elapsedSeconds) : formatDigits(timerStatus.remainingSeconds))
    : '25:00';

  // Calculate Normal 7-Day Weekly Strip (Mon - Sun)
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekRange = getWeekRange(todayStr);
  const calendarMap = new Map(calendarDays.map(d => [d.date, d.status]));
  
  const mondayDate = new Date(weekRange.start + 'T12:00:00');
  const weekDaysList = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + i);
    const dStr = toISODateString(d);
    const status = calendarMap.get(dStr) || 'GRAY';
    const isToday = dStr === todayStr;

    let dotColor = '#bdc3c7';
    if (status === 'GREEN') dotColor = '#2ecc71';
    else if (status === 'YELLOW') dotColor = '#f1c40f';
    else if (status === 'ORANGE') dotColor = '#e67e22';
    else if (status === 'RED') dotColor = '#e74c3c';
    else if (status === 'REST') dotColor = '#95a5a6';

    weekDaysList.push({
      name: dayNames[i],
      dateNum: d.getDate(),
      dateStr: dStr,
      status,
      isToday,
      dotColor
    });
  }

  container.innerHTML = `
    <!-- Hero Banner Card with Level Progress & Normal 7-Day Weekly Strip -->
    <div class="hero-banner-card" style="margin-bottom: 25px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:15px;">
        <div>
          <h2 style="font-size: 26px; font-weight: 800; margin:0;">Welcome back, ${userProfile?.username || 'Student'} 👋</h2>
          <p style="opacity: 0.9; font-size: 13px; margin-top:4px;">Level ${levelData.level} Scholar | ${levelData.xpInCurrentLevel} / ${levelData.xpNeededForNextLevel} XP to Level ${levelData.level + 1}</p>
        </div>
      </div>

      <!-- XP Progress Bar -->
      <div class="xp-progress-bar-bg">
        <div class="xp-progress-bar-fill" style="width: ${levelData.progressPct}%;"></div>
      </div>

      <!-- Normal 7-Day Weekly Strip -->
      <div class="weekly-day-strip">
        ${weekDaysList.map(w => `
          <div class="weekly-day-pill ${w.isToday ? 'is-today' : ''}">
            <span class="weekly-day-name">${w.name}</span>
            <span class="weekly-day-num">${w.dateNum}</span>
            <span class="weekly-day-dot" style="background-color: ${w.dotColor};"></span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="dashboard-grid">
      <!-- Active Timer Hero Card with Ring -->
      <div class="card col-8">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
          <h3 style="font-size: 18px; font-weight: 700; color: var(--primary-grass);">Study Timer</h3>
          <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Monotonic Timestamp Engine</span>
        </div>
        
        <div class="timer-hero">
          <div class="dashboard-timer-ring">
            <div class="timer-clock-digits" id="dash-timer-digits">${timerDigits}</div>
            <div style="font-size:11px; opacity:0.7; font-weight:700; text-transform:uppercase;">${timerStatus.mode || 'POMODORO'}</div>
          </div>

          <div style="display:flex; gap:10px; justify-content:center; margin-bottom: 15px;">
            <select id="dash-subject-select" class="form-input" style="width:auto; min-width:160px;">
              ${activeSubjects.map(s => `<option value="${s.id}">${s.title}</option>`).join('')}
            </select>
            <select id="dash-mode-select" class="form-input" style="width:auto; min-width:160px;">
              <option value="POMODORO">Pomodoro (25m)</option>
              <option value="STOPWATCH">Stopwatch</option>
              <option value="COUNTDOWN">Countdown (50m)</option>
            </select>
          </div>

          <div class="timer-controls" id="dash-timer-controls-box">
            ${timerStatus.state === TIMER_STATES.IDLE ? `
              <button class="btn-primary" id="dash-start-btn">Start Session</button>
              <button class="btn-secondary" id="dash-focus-btn">Focus Mode 🎯</button>
            ` : timerStatus.state === TIMER_STATES.RUNNING ? `
              <button class="btn-secondary" id="dash-pause-btn">Pause</button>
              <button class="btn-danger" id="dash-stop-btn">Stop & Save Session</button>
              <button class="btn-secondary" id="dash-focus-btn">Focus Mode 🎯</button>
            ` : `
              <button class="btn-primary" id="dash-resume-btn">Resume</button>
              <button class="btn-danger" id="dash-stop-btn">Stop & Save Session</button>
              <button class="btn-secondary" id="dash-focus-btn">Focus Mode 🎯</button>
            `}
          </div>
        </div>
      </div>

      <!-- Quick Metrics Column -->
      <div class="card col-4" style="display:flex; flex-direction:column; gap:15px;">
        <h3 style="font-size: 16px; font-weight: 700; color: var(--primary-grass);">Today's Overview</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div style="background:var(--card-solid-bg); border:1px solid var(--card-border); padding:14px; border-radius:12px; text-align:center;">
            <div style="font-size:24px; font-weight:800; color:var(--primary-grass);">${todayHours}h</div>
            <div style="font-size:11px; color:var(--text-muted); font-weight:600;">Study Time</div>
          </div>
          <div style="background:var(--card-solid-bg); border:1px solid var(--card-border); padding:14px; border-radius:12px; text-align:center;">
            <div style="font-size:24px; font-weight:800; color:var(--primary-grass);">${todayTasks.filter(t => t.completed).length}/${todayTasks.length}</div>
            <div style="font-size:11px; color:var(--text-muted); font-weight:600;">Tasks Done</div>
          </div>
        </div>
        <button class="btn-secondary" id="toggle-rest-btn" style="justify-content:center; margin-top:auto;">
          🌙 Log Rest Day (Max 2/wk)
        </button>
      </div>

      <!-- Separate Annotation Card for Daily Performance (§17 Rules) -->
      <div class="card col-12" style="background: var(--card-solid-bg);">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--primary-forest); margin-bottom: 12px;">
          📊 Daily Performance Rating Legend & Rules (§17)
        </h3>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
          <div style="padding:10px; background:var(--bg-main); border-radius:10px; border-left:4px solid #2ecc71;">
            <span class="status-badge green">🟢 Green</span>
            <div style="font-size:12px; margin-top:4px; font-weight:500;">100% scheduled tasks completed AND study goal hit.</div>
          </div>
          <div style="padding:10px; background:var(--bg-main); border-radius:10px; border-left:4px solid #f1c40f;">
            <span class="status-badge yellow">🟡 Yellow</span>
            <div style="font-size:12px; margin-top:4px; font-weight:500;">80% – 99% task completion rate achieved.</div>
          </div>
          <div style="padding:10px; background:var(--bg-main); border-radius:10px; border-left:4px solid #e67e22;">
            <span class="status-badge orange">🟠 Orange</span>
            <div style="font-size:12px; margin-top:4px; font-weight:500;">50% – 79% task completion rate achieved.</div>
          </div>
          <div style="padding:10px; background:var(--bg-main); border-radius:10px; border-left:4px solid #e74c3c;">
            <span class="status-badge red">🔴 Red</span>
            <div style="font-size:12px; margin-top:4px; font-weight:500;">>3 tasks missed, OR <50% completion, OR 0 mins logged. <strong>Resets active streak!</strong></div>
          </div>
          <div style="padding:10px; background:var(--bg-main); border-radius:10px; border-left:4px solid #95a5a6;">
            <span class="status-badge rest">🌙 Rest Day</span>
            <div style="font-size:12px; margin-top:4px; font-weight:500;">Scheduled break day (Max 2 per calendar week). <strong>Preserves streak!</strong></div>
          </div>
          <div style="padding:10px; background:var(--bg-main); border-radius:10px; border-left:4px solid #bdc3c7;">
            <span class="status-badge gray">⚪ Gray</span>
            <div style="font-size:12px; margin-top:4px; font-weight:500;">Neutral day with no activity or scheduled tasks.</div>
          </div>
        </div>
      </div>

      <!-- Today Tasks Widget with Inline Quick Add -->
      <div class="card col-6">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;">
          <h3 style="font-size: 16px; font-weight: 700; color: var(--primary-grass);">Today's Tasks</h3>
          <span style="font-size:12px; color:var(--text-muted); font-weight:600;">${todayTasks.length} Scheduled</span>
        </div>
        
        <form id="dash-quick-task-form" style="display:flex; gap:8px; margin-bottom:15px;">
          <input type="text" id="dash-quick-task-input" class="form-input" placeholder="+ Quick add task for today..." required style="flex:1;">
          <button type="submit" class="btn-primary" style="padding:6px 16px; font-size:13px; min-height:44px;">Add</button>
        </form>

        <div id="dash-task-list">
          ${todayTasks.length === 0 ? `<div style="color:var(--text-muted); font-size:13px; text-align:center; padding:15px;">No tasks scheduled for today. Type above to quick-add!</div>` : 
            todayTasks.map(t => `
              <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:var(--card-solid-bg); border-radius:10px; margin-bottom:8px; border:1px solid var(--card-border);">
                <span style="${t.completed ? 'text-decoration:line-through; opacity:0.6;' : ''} font-weight:600;">${t.title}</span>
                <span class="priority-tag ${t.priority || 'medium'}">${t.priority || 'medium'}</span>
              </div>
            `).join('')}
        </div>
      </div>

      <!-- 365-Day Activity Heatmap Widget -->
      <div class="card col-6">
        <h3 style="font-size: 16px; font-weight: 700; color: var(--primary-grass); margin-bottom: 15px;">Consistency Heatmap</h3>
        <div id="dash-heatmap-container"></div>
      </div>
    </div>
  `;

  renderAnnualHeatmap(document.getElementById('dash-heatmap-container'), calendarDays);

  // Bind Quick Add Task
  document.getElementById('dash-quick-task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('dash-quick-task-input');
    const title = input?.value.trim();
    if (!title) return;

    const newTask = {
      id: 'task_' + Date.now(),
      title,
      category: 'Study',
      priority: 'medium',
      dueDate: todayStr,
      completed: false,
      recurring: 'none',
      schemaVersion: 1
    };

    await putRecord('tasks', newTask);
    showToast("Task added to today's list!", "success");
    renderDashboardPage(container);
  });

  // Bind Timer Hero Controls
  document.getElementById('dash-start-btn')?.addEventListener('click', () => {
    const subjId = document.getElementById('dash-subject-select')?.value;
    const mode = document.getElementById('dash-mode-select')?.value;
    if (!subjId) {
      showToast("Please create a study subject first!", "error");
      return;
    }
    timerEngine.start(subjId, mode, mode === 'POMODORO' ? 25 : 50);
    showToast("Study session started!", "success");
  });

  document.getElementById('dash-pause-btn')?.addEventListener('click', () => timerEngine.pause());
  document.getElementById('dash-resume-btn')?.addEventListener('click', () => timerEngine.resume());
  document.getElementById('dash-stop-btn')?.addEventListener('click', () => handleStopTimerSession());

  document.getElementById('dash-focus-btn')?.addEventListener('click', () => {
    document.getElementById('focus-mode-overlay').style.display = 'flex';
  });

  document.getElementById('toggle-rest-btn')?.addEventListener('click', async () => {
    const res = await toggleRestDay(todayStr);
    if (!res.success) {
      showToast(res.error, "error");
    } else {
      showToast(res.isRest ? "Rest Day logged! Streak preserved." : "Rest Day removed.", "info");
      renderDashboardPage(container);
    }
  });
}

/**
 * 2. Study & Subject Manager View
 */
async function renderStudyPage(container) {
  const [subjects, sessions] = await Promise.all([
    getAll('subjects'),
    getAll('sessions')
  ]);

  const activeSubjects = subjects.filter(s => !s.archived);

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px; flex-wrap:wrap; gap:10px;">
      <div>
        <h2 style="font-size: 28px; font-weight: 800; color: var(--primary-forest);">Study Module & Active Subjects</h2>
        <p style="color: var(--text-muted); font-size: 14px;">Manage up to 10 active study subjects. Archiving retains all historical session logs.</p>
      </div>
      <button class="btn-primary" id="open-subj-modal-btn" ${activeSubjects.length >= 10 ? 'disabled style="opacity:0.5;"' : ''}>
        + New Subject (${activeSubjects.length}/10)
      </button>
    </div>

    <div class="dashboard-grid">
      ${activeSubjects.map(s => {
        const subjSessions = sessions.filter(sess => sess.subjectId === s.id);
        const subjSecs = subjSessions.reduce((acc, sess) => acc + (sess.durationSeconds || 0), 0);
        const subjHours = (subjSecs / 3600).toFixed(1);

        return `
          <div class="card col-4" style="border-top: 5px solid ${s.color || 'var(--primary-grass)'};">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <h3 style="font-size: 18px; font-weight: 800; color:var(--text-main);">${s.title}</h3>
              <button class="archive-subj-btn" data-id="${s.id}" style="color:var(--accent-red); font-size:12px; font-weight:700;">Archive</button>
            </div>
            
            <div style="margin: 15px 0; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div style="background:var(--card-solid-bg); padding:10px; border-radius:8px; text-align:center; border:1px solid var(--card-border);">
                <div style="font-size:18px; font-weight:800; color:var(--primary-grass);">${subjHours}h</div>
                <div style="font-size:10px; color:var(--text-muted);">Study Time</div>
              </div>
              <div style="background:var(--card-solid-bg); padding:10px; border-radius:8px; text-align:center; border:1px solid var(--card-border);">
                <div style="font-size:18px; font-weight:800; color:var(--primary-grass);">${subjSessions.length}</div>
                <div style="font-size:10px; color:var(--text-muted);">Sessions</div>
              </div>
            </div>

            <button class="btn-secondary start-sprint-btn" data-id="${s.id}" style="width:100%; font-size:13px;">▶ Quick 25m Sprint</button>
          </div>
        `;
      }).join('')}
    </div>
  `;

  document.getElementById('open-subj-modal-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('subject-modal');
    if (modal) modal.style.display = 'flex';
  });

  container.querySelectorAll('.start-sprint-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      timerEngine.start(id, TIMER_MODES.POMODORO, 25);
      showToast("25-minute study sprint started!", "success");
      currentPage = 'dashboard';
      renderPage('dashboard');
    });
  });

  container.querySelectorAll('.archive-subj-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      const subj = await getByKey('subjects', id);
      if (subj) {
        subj.archived = true;
        await putRecord('subjects', subj);
        showToast("Subject archived. Historical logs retained.", "info");
        renderStudyPage(container);
      }
    });
  });
}

/**
 * 3. Task Manager View
 */
async function renderTasksPage(container) {
  const tasks = await getAll('tasks');
  const todayStr = toISODateString();

  let filteredTasks = tasks;
  if (currentTaskFilter === 'today') {
    filteredTasks = tasks.filter(t => t.dueDate === todayStr);
  } else if (currentTaskFilter === 'upcoming') {
    filteredTasks = tasks.filter(t => t.dueDate && t.dueDate > todayStr && !t.completed);
  } else if (currentTaskFilter === 'completed') {
    filteredTasks = tasks.filter(t => t.completed);
  }

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px; flex-wrap:wrap; gap:10px;">
      <div>
        <h2 style="font-size: 28px; font-weight: 800; color: var(--primary-forest);">Task Manager</h2>
        <p style="color: var(--text-muted); font-size: 14px;">Completed tasks from past days become read-only to safeguard calendar ratings.</p>
      </div>
      <button class="btn-primary" id="open-task-modal-btn">+ Add New Task</button>
    </div>

    <!-- Filter Tab Bar -->
    <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
      <button class="btn-secondary filter-tab ${currentTaskFilter === 'all' ? 'active' : ''}" data-filter="all">All (${tasks.length})</button>
      <button class="btn-secondary filter-tab ${currentTaskFilter === 'today' ? 'active' : ''}" data-filter="today">Today (${tasks.filter(t => t.dueDate === todayStr).length})</button>
      <button class="btn-secondary filter-tab ${currentTaskFilter === 'upcoming' ? 'active' : ''}" data-filter="upcoming">Upcoming</button>
      <button class="btn-secondary filter-tab ${currentTaskFilter === 'completed' ? 'active' : ''}" data-filter="completed">Completed (${tasks.filter(t => t.completed).length})</button>
    </div>

    <div class="card">
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${filteredTasks.length === 0 ? `<div style="color:var(--text-muted); padding:25px; text-align:center;">No tasks found in this filter. Click "+ Add New Task" to create one!</div>` :
          filteredTasks.map(t => {
            const isPastCompleted = t.completed && t.dueDate && t.dueDate < todayStr;
            return `
              <div style="display:flex; align-items:center; justify-content:space-between; padding:14px; background:var(--card-solid-bg); border-radius:10px; border:1px solid var(--card-border);">
                <div style="display:flex; align-items:center; gap:14px;">
                  <input type="checkbox" data-id="${t.id}" class="task-checkbox" ${t.completed ? 'checked' : ''} ${isPastCompleted ? 'disabled title="Past completed task is locked read-only"' : ''} style="width:20px; height:20px; cursor:pointer;">
                  <div>
                    <div style="${t.completed ? 'text-decoration:line-through; opacity:0.6;' : ''} font-weight:700;">${t.title}</div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Due: ${t.dueDate || 'No Date'} | Recurrence: ${t.recurring || 'none'}</div>
                  </div>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                  <span class="badge-item" style="font-size:11px;">${t.category || 'Study'}</span>
                  <span class="priority-tag ${t.priority || 'medium'}">${t.priority || 'medium'}</span>
                  ${isPastCompleted ? `<span style="font-size:11px; color:var(--text-muted);">🔒 Locked</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      currentTaskFilter = e.currentTarget.getAttribute('data-filter');
      renderTasksPage(container);
    });
  });

  document.getElementById('open-task-modal-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('task-modal');
    if (modal) modal.style.display = 'flex';
  });

  container.querySelectorAll('.task-checkbox').forEach(box => {
    box.addEventListener('change', async (e) => {
      const id = e.target.getAttribute('data-id');
      const task = await getByKey('tasks', id);
      if (task) {
        task.completed = e.target.checked;
        task.completedTimestamp = e.target.checked ? Date.now() : null;
        await putRecord('tasks', task);
        if (task.completed) {
          const xp = await awardXP('TASK_COMPLETED', { category: task.category });
          showToast(`Task completed! +${xp.amount} XP`, "success");
        }
        await evaluateDayStatus(todayStr);
        await updateHeaderStats();
        renderTasksPage(container);
      }
    });
  });
}

/**
 * 4. Personal Growth View
 */
async function renderGrowthPage(container) {
  const habits = await getAll('habits');
  const todayStr = toISODateString();

  const getHabitStreak = (completedDates = []) => {
    if (!completedDates || completedDates.length === 0) return 0;
    const sorted = [...completedDates].sort().reverse();
    let streak = 0;
    let checkDate = new Date();

    for (let i = 0; i < 365; i++) {
      const dStr = toISODateString(checkDate);
      if (sorted.includes(dStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  };

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px; flex-wrap:wrap; gap:10px;">
      <div>
        <h2 style="font-size: 28px; font-weight: 800; color: var(--primary-forest);">Personal Growth & Habits</h2>
        <p style="color: var(--text-muted); font-size: 14px;">Build daily habits and track mental & physical wellness.</p>
      </div>
      <button class="btn-primary" id="add-habit-btn">+ Add Custom Habit</button>
    </div>

    <div class="dashboard-grid">
      <div class="card col-8">
        <h3 style="margin-bottom:15px; color:var(--primary-grass);">Active Habits</h3>
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${habits.length === 0 ? `<div style="color:var(--text-muted); font-size:13px; padding:15px; text-align:center;">No custom habits created yet. Select a preset below or create your own!</div>` :
            habits.map(h => {
              const isDoneToday = (h.completedDates || []).includes(todayStr);
              const streak = getHabitStreak(h.completedDates);
              return `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:14px; background:var(--card-solid-bg); border-radius:10px; border:1px solid var(--card-border);">
                  <div>
                    <strong style="${isDoneToday ? 'text-decoration:line-through; opacity:0.6;' : ''} font-size:15px;">${h.title}</strong>
                    <span style="font-size:11px; color:var(--text-muted); margin-left:8px;">(${h.category})</span>
                    ${streak > 0 ? `<span class="badge-item" style="font-size:11px; margin-left:8px; padding:2px 8px;">🔥 ${streak}d streak</span>` : ''}
                  </div>
                  <button class="btn-secondary habit-toggle-btn" data-id="${h.id}" style="font-size:12px; padding:6px 14px; background:${isDoneToday ? 'var(--primary-grass)' : ''}; color:${isDoneToday ? 'white' : ''};">
                    ${isDoneToday ? '✓ Done Today (+5 XP)' : 'Mark Done'}
                  </button>
                </div>
              `;
            }).join('')}
        </div>
      </div>

      <div class="card col-4">
        <h3 style="margin-bottom:15px; color:var(--primary-grass);">Suggested Presets</h3>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">Click to add a suggested habit:</p>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <button class="btn-secondary add-preset-btn" data-title="Reading (30 mins)" data-cat="Mental" style="justify-content:flex-start;">📚 Reading (30 mins)</button>
          <button class="btn-secondary add-preset-btn" data-title="Meditation (10 mins)" data-cat="Mental" style="justify-content:flex-start;">🧘 Meditation (10 mins)</button>
          <button class="btn-secondary add-preset-btn" data-title="Exercise / Workout" data-cat="Physical" style="justify-content:flex-start;">🏋️ Exercise / Workout</button>
          <button class="btn-secondary add-preset-btn" data-title="Daily Walking (5,000 steps)" data-cat="Physical" style="justify-content:flex-start;">🚶 Daily Walking</button>
          <button class="btn-secondary add-preset-btn" data-title="Journaling & Reflection" data-cat="Mental" style="justify-content:flex-start;">✍️ Journaling & Reflection</button>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.habit-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const habit = await getByKey('habits', id);
      if (habit) {
        if (!habit.completedDates) habit.completedDates = [];
        const isDone = habit.completedDates.includes(todayStr);
        if (isDone) {
          habit.completedDates = habit.completedDates.filter(d => d !== todayStr);
        } else {
          habit.completedDates.push(todayStr);
          await awardXP('HABIT_COMPLETED');
          showToast(`Habit completed! +5 XP`, "success");
        }
        await putRecord('habits', habit);
        await updateHeaderStats();
        renderGrowthPage(container);
      }
    });
  });

  container.querySelectorAll('.add-preset-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const title = e.currentTarget.getAttribute('data-title');
      const cat = e.currentTarget.getAttribute('data-cat');

      const newHabit = {
        id: 'habit_' + Date.now(),
        title,
        category: cat,
        completedDates: [],
        schemaVersion: 1
      };
      await putRecord('habits', newHabit);
      showToast(`Preset habit "${title}" added!`, "success");
      renderGrowthPage(container);
    });
  });

  document.getElementById('add-habit-btn')?.addEventListener('click', async () => {
    const title = prompt("Habit Title:");
    if (!title || !title.trim()) return;

    const cat = prompt("Category (Physical / Mental / Personal):", "Mental") || "Mental";

    const newHabit = {
      id: 'habit_' + Date.now(),
      title: title.trim(),
      category: cat.trim(),
      completedDates: [],
      schemaVersion: 1
    };
    await putRecord('habits', newHabit);
    showToast("Custom habit added!", "success");
    renderGrowthPage(container);
  });
}

/**
 * 5. Social Reminders View
 */
async function renderRemindersPage(container) {
  let reminders = await getAll('reminders');

  if (reminders.length === 0) {
    const defaultReminders = [
      { id: 'rem_1', platform: 'github', label: 'Reminder: review GitHub contributions', link: 'https://github.com', frequency: 'Daily', lastChecked: null, schemaVersion: 1 },
      { id: 'rem_2', platform: 'linkedin', label: 'Reminder: check LinkedIn updates', link: 'https://linkedin.com', frequency: 'Daily', lastChecked: null, schemaVersion: 1 },
      { id: 'rem_3', platform: 'instagram', label: 'Reminder: check Instagram messages', link: 'https://instagram.com', frequency: 'Daily', lastChecked: null, schemaVersion: 1 }
    ];
    for (const r of defaultReminders) {
      await putRecord('reminders', r);
    }
    reminders = await getAll('reminders');
  }

  container.innerHTML = `
    <div style="margin-bottom: 25px;">
      <h2 style="font-size: 28px; font-weight: 800; color: var(--primary-forest);">Social Reminder Center</h2>
      <p style="color: var(--text-muted); font-size: 14px;">Manual self-checked reminders. No external APIs or automated tracking used.</p>
    </div>

    <div class="card">
      <ul style="list-style:none; display:flex; flex-direction:column; gap:12px;">
        ${reminders.map(r => `
          <li style="padding:14px; background:var(--card-solid-bg); border-radius:10px; border:1px solid var(--card-border); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-weight:700;">🔔 ${r.label}</span>
              ${r.lastChecked ? `<div style="font-size:11px; color:var(--text-muted); margin-top:3px;">Last checked: ${new Date(r.lastChecked).toLocaleString()}</div>` : ''}
            </div>
            <button class="btn-secondary check-reminder-btn" data-id="${r.id}" style="font-size:12px; padding:6px 14px;">
              Check Off Today
            </button>
          </li>
        `).join('')}
      </ul>
    </div>
  `;

  container.querySelectorAll('.check-reminder-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const rem = await getByKey('reminders', id);
      if (rem) {
        rem.lastChecked = Date.now();
        await putRecord('reminders', rem);
        showToast("Reminder checked off!", "success");
        renderRemindersPage(container);
      }
    });
  });
}

/**
 * 6. Analytics View
 */
async function renderAnalyticsPage(container) {
  const [sessions, subjects] = await Promise.all([
    getAll('sessions'),
    getAll('subjects')
  ]);

  container.innerHTML = `
    <div style="margin-bottom: 25px;">
      <h2 style="font-size: 28px; font-weight: 800; color: var(--primary-forest);">Analytics & Progress</h2>
      <p style="color: var(--text-muted); font-size: 14px;">Detailed statistical insights into study distribution and hours logged.</p>
    </div>

    <div class="dashboard-grid">
      <div class="card col-8">
        <h3>Study Hours Trend (Last 7 Days)</h3>
        <div id="chart-hours-container" style="margin-top:20px;"></div>
      </div>
      <div class="card col-4">
        <h3>Subject Distribution</h3>
        <div id="chart-donut-container" style="margin-top:20px;"></div>
      </div>
    </div>
  `;

  const subjMap = new Map(subjects.map(s => [s.id, s]));
  const subjTotals = new Map();

  sessions.forEach(s => {
    const mins = Math.round((s.durationSeconds || 0) / 60);
    subjTotals.set(s.subjectId, (subjTotals.get(s.subjectId) || 0) + mins);
  });

  const donutData = Array.from(subjTotals.entries()).map(([subjId, val]) => ({
    label: subjMap.get(subjId)?.title || 'General',
    value: val,
    color: subjMap.get(subjId)?.color || 'var(--primary-grass)'
  }));

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const realHoursData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = toISODateString(d);
    const dayLabel = daysOfWeek[d.getDay()];

    const daySecs = sessions
      .filter(s => toISODateString(s.startTimestamp) === dateStr)
      .reduce((acc, s) => acc + (s.durationSeconds || 0), 0);

    realHoursData.push({
      label: dayLabel,
      value: parseFloat((daySecs / 3600).toFixed(1))
    });
  }

  renderStudyHoursBarChart(document.getElementById('chart-hours-container'), realHoursData);
  renderSubjectDistributionDonut(document.getElementById('chart-donut-container'), donutData);
}

/**
 * 7. Unified Profile & Settings View (§19, §20 Fully Integrated)
 */
async function renderProfilePage(container) {
  const [sessions, tasks, achievements] = await Promise.all([
    getAll('sessions'),
    getAll('tasks'),
    getAll('achievements')
  ]);

  const unlockedMap = new Map(achievements.map(a => [a.id, a]));
  const totalStudySecs = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const totalHours = (totalStudySecs / 3600).toFixed(1);
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const levelData = getLevelData(userProfile?.totalXP || 0);

  container.innerHTML = `
    <!-- Profile Header Card -->
    <div class="card" style="margin-bottom: 25px; text-align:center;">
      <div style="font-size:64px;">👤</div>
      <h2 style="font-size: 26px; font-weight: 800; margin-top:8px;">${userProfile?.username || 'Student'}</h2>
      <p style="color:var(--text-muted); font-size:13px;">Level ${levelData.level} Scholar | Joined ${new Date(userProfile?.joinedTimestamp || Date.now()).toLocaleDateString()}</p>
    </div>

    <!-- Quick Stats Summary Grid -->
    <div class="dashboard-grid" style="margin-bottom:25px;">
      <div class="card col-3" style="text-align:center;">
        <div style="font-size:24px; font-weight:800; color:var(--primary-grass);">${totalHours}h</div>
        <div style="font-size:12px; color:var(--text-muted); font-weight:600;">Total Study Time</div>
      </div>
      <div class="card col-3" style="text-align:center;">
        <div style="font-size:24px; font-weight:800; color:var(--primary-grass);">${sessions.length}</div>
        <div style="font-size:12px; color:var(--text-muted); font-weight:600;">Total Sessions</div>
      </div>
      <div class="card col-3" style="text-align:center;">
        <div style="font-size:24px; font-weight:800; color:var(--primary-grass);">${completedTasksCount}</div>
        <div style="font-size:12px; color:var(--text-muted); font-weight:600;">Tasks Completed</div>
      </div>
      <div class="card col-3" style="text-align:center;">
        <div style="font-size:24px; font-weight:800; color:var(--primary-grass);">${userProfile?.totalXP || 0}</div>
        <div style="font-size:12px; color:var(--text-muted); font-weight:600;">Cumulative XP</div>
      </div>
    </div>

    <!-- ⚙️ FULLY INTEGRATED SETTINGS & PREFERENCES HUB -->
    <div class="card" style="margin-bottom: 25px;">
      <h3 style="margin-bottom:20px; color:var(--primary-grass); font-size:20px; font-weight:800; display:flex; align-items:center; gap:10px;">
        ⚙️ Settings & Preferences Hub
      </h3>

      <div class="dashboard-grid">
        <!-- Profile Identity Settings -->
        <div class="col-6" style="display:flex; flex-direction:column; gap:14px; background:var(--card-solid-bg); padding:16px; border-radius:12px; border:1px solid var(--card-border);">
          <h4 style="font-size:15px; font-weight:700; color:var(--primary-forest); margin:0;">User Identity</h4>
          <form id="profile-edit-name-form" style="display:flex; gap:8px;">
            <input type="text" id="profile-input-name" class="form-input" value="${userProfile?.username || ''}" placeholder="Update Username" required style="flex:1;">
            <button type="submit" class="btn-primary" style="padding:6px 18px; font-size:13px;">Save</button>
          </form>
        </div>

        <!-- Appearance & Goals Settings -->
        <div class="col-6" style="display:flex; flex-direction:column; gap:14px; background:var(--card-solid-bg); padding:16px; border-radius:12px; border:1px solid var(--card-border);">
          <h4 style="font-size:15px; font-weight:700; color:var(--primary-forest); margin:0;">Appearance & Goals</h4>
          <label style="font-size:13px; font-weight:600;">Theme Preference:
            <select id="profile-setting-theme" class="form-input" style="margin-top:4px;">
              <option value="light" ${appSettings.theme === 'light' ? 'selected' : ''}>Light Mode</option>
              <option value="dark" ${appSettings.theme === 'dark' ? 'selected' : ''}>Dark Mode</option>
            </select>
          </label>
          <label style="font-size:13px; font-weight:600;">Daily Study Goal (Minutes):
            <input type="number" id="profile-setting-goal" value="${appSettings.dailyStudyGoalMinutes || 30}" min="10" max="600" class="form-input" style="margin-top:4px;">
          </label>
        </div>

        <!-- Accessibility Preferences -->
        <div class="col-6" style="display:flex; flex-direction:column; gap:10px; background:var(--card-solid-bg); padding:16px; border-radius:12px; border:1px solid var(--card-border);">
          <h4 style="font-size:15px; font-weight:700; color:var(--primary-forest); margin:0;">Accessibility Modes</h4>
          <label style="font-size:13px; font-weight:600;"><input type="checkbox" id="profile-setting-high-contrast" ${appSettings.highContrast ? 'checked' : ''}> High Contrast Mode (WCAG AAA)</label>
          <label style="font-size:13px; font-weight:600;"><input type="checkbox" id="profile-setting-reduced-transparency" ${appSettings.reducedTransparency ? 'checked' : ''}> Reduced Transparency Mode</label>
          <label style="font-size:13px; font-weight:600;"><input type="checkbox" id="profile-setting-reduced-motion" ${appSettings.reducedMotion ? 'checked' : ''}> Reduced Motion Mode</label>
        </div>

        <!-- Data Backup & Data Ownership Hub -->
        <div class="col-6" style="display:flex; flex-direction:column; gap:10px; background:var(--card-solid-bg); padding:16px; border-radius:12px; border:1px solid var(--card-border);">
          <h4 style="font-size:15px; font-weight:700; color:var(--primary-forest); margin:0;">Data Ownership & Backups</h4>
          <button class="btn-primary" id="profile-btn-export-json" style="justify-content:flex-start; font-size:13px; min-height:42px;">📥 Export Full JSON Backup</button>
          <input type="file" id="profile-import-json-file" accept=".json" style="display:none;">
          <button class="btn-secondary" id="profile-btn-import-json" style="justify-content:flex-start; font-size:13px; min-height:42px;">📤 Restore JSON Backup</button>
          <button class="btn-secondary" id="profile-btn-export-csv" style="justify-content:flex-start; font-size:13px; min-height:42px;">📊 Export CSV Reports</button>
          <button class="btn-secondary" id="profile-btn-export-pdf" style="justify-content:flex-start; font-size:13px; min-height:42px;">📄 Generate PDF Summary</button>
          <button class="btn-secondary" id="profile-btn-reset-app" style="justify-content:flex-start; font-size:13px; color:var(--accent-red); border-color:var(--accent-red); min-height:42px;">⚠️ Reset Application Data</button>
        </div>
      </div>
    </div>

    <!-- Achievements Showcase -->
    <div class="card">
      <h3 style="margin-bottom:15px; color:var(--primary-grass);">Achievements Showcase</h3>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:15px;">
        ${ACHIEVEMENTS_DEF.map(def => {
          const isUnlocked = unlockedMap.get(def.id)?.unlocked;
          return `
            <div style="background:var(--card-solid-bg); border:1px solid var(--card-border); padding:15px; border-radius:10px; opacity:${isUnlocked ? 1 : 0.45};">
              <div style="font-size:32px;">${def.icon}</div>
              <div style="font-weight:700; font-size:14px; margin-top:6px;">${def.title} ${isUnlocked ? '✓' : ''}</div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${def.desc}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Bind Integrated Settings Controls
  document.getElementById('profile-edit-name-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('profile-input-name').value.trim();
    if (newName && userProfile) {
      userProfile.username = newName;
      await putRecord('profile', userProfile);
      showToast("Username updated successfully!", "success");
      await updateHeaderStats();
      renderProfilePage(container);
    }
  });

  document.getElementById('profile-setting-theme')?.addEventListener('change', async (e) => {
    appSettings.theme = e.target.value;
    await putRecord('settings', appSettings);
    applyThemeSettings(appSettings);
  });

  document.getElementById('profile-setting-goal')?.addEventListener('change', async (e) => {
    appSettings.dailyStudyGoalMinutes = parseInt(e.target.value) || 30;
    await putRecord('settings', appSettings);
    showToast("Daily study goal updated!", "success");
  });

  document.getElementById('profile-setting-high-contrast')?.addEventListener('change', async (e) => {
    appSettings.highContrast = e.target.checked;
    await putRecord('settings', appSettings);
    applyThemeSettings(appSettings);
  });

  document.getElementById('profile-setting-reduced-transparency')?.addEventListener('change', async (e) => {
    appSettings.reducedTransparency = e.target.checked;
    await putRecord('settings', appSettings);
    applyThemeSettings(appSettings);
  });

  document.getElementById('profile-setting-reduced-motion')?.addEventListener('change', async (e) => {
    appSettings.reducedMotion = e.target.checked;
    await putRecord('settings', appSettings);
    applyThemeSettings(appSettings);
  });

  document.getElementById('profile-btn-export-json')?.addEventListener('click', downloadJSONBackup);

  const importInput = document.getElementById('profile-import-json-file');
  document.getElementById('profile-btn-import-json')?.addEventListener('click', () => importInput?.click());
  importInput?.addEventListener('change', async (e) => {
    if (e.target.files[0]) {
      try {
        await restoreJSONBackupFile(e.target.files[0]);
        showToast("Backup restored successfully!", "success");
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        showToast(err.message, "error");
      }
    }
  });

  document.getElementById('profile-btn-export-csv')?.addEventListener('click', exportSessionsCSV);
  document.getElementById('profile-btn-export-pdf')?.addEventListener('click', generatePDFReport);

  document.getElementById('profile-btn-reset-app')?.addEventListener('click', async () => {
    if (confirm("Are you sure you want to reset StudyOS? All data will be cleared.")) {
      const stores = ['profile', 'subjects', 'sessions', 'tasks', 'habits', 'xp_history', 'achievements', 'calendar_days', 'reminders', 'settings'];
      for (const s of stores) {
        await clearStore(s);
      }
      localStorage.clear();
      showToast("App reset complete. Reloading...", "info");
      setTimeout(() => window.location.reload(), 1000);
    }
  });
}

/**
 * Onboarding Wizard for First Launch (§7)
 */
function renderOnboardingWizard() {
  const container = document.getElementById('page-content');
  if (!container) return;

  container.innerHTML = `
    <div class="card" style="max-width: 600px; margin: 40px auto; padding: 40px;">
      <h2 style="font-size: 26px; font-weight: 800; color: var(--primary-grass); text-align:center;">Welcome to StudyOS v5</h2>
      <p style="font-size: 13px; color: var(--text-muted); text-align:center; margin-bottom: 25px;">
        Setup your offline personal productivity environment.
      </p>

      <div style="background:var(--accent-light-mint); padding:12px; border-radius:8px; font-size:12px; color:var(--primary-forest); margin-bottom:20px;">
        🔒 <strong>Data Ownership Disclaimer:</strong> All your data lives strictly on this device. Be sure to export periodic JSON backups.
      </div>

      <form id="onboarding-form" style="display:flex; flex-direction:column; gap:15px;">
        <label>Username:
          <input type="text" id="ob-username" required class="form-input" placeholder="Your Name">
        </label>

        <label>First Active Study Subject:
          <input type="text" id="ob-subject" required class="form-input" placeholder="e.g. Mathematics / Computer Science">
        </label>

        <label>Daily Study Goal (Minutes):
          <input type="number" id="ob-goal" value="30" min="10" max="600" class="form-input">
        </label>

        <button type="submit" class="btn-primary" style="justify-content:center; padding:12px; font-size:16px; margin-top:10px;">Initialize StudyOS</button>
      </form>
    </div>
  `;

  document.getElementById('onboarding-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('ob-username').value.trim();
    const subjTitle = document.getElementById('ob-subject').value.trim();
    const studyGoal = parseInt(document.getElementById('ob-goal').value) || 30;

    const profileObj = {
      id: 'user_profile',
      username,
      totalXP: 0,
      longestStreak: 0,
      joinedTimestamp: Date.now(),
      schemaVersion: 1
    };
    await putRecord('profile', profileObj);

    const initialSubj = {
      id: 'subj_' + Date.now(),
      moduleType: 'STUDY',
      title: subjTitle,
      color: '#2d6a4f',
      createdTimestamp: Date.now(),
      archived: false,
      metadata: {},
      schemaVersion: 1
    };
    await putRecord('subjects', initialSubj);

    await putRecord('settings', {
      key: 'app_settings',
      dailyStudyGoalMinutes: studyGoal,
      dailyTaskGoalCount: 3,
      theme: 'light',
      schemaVersion: 1
    });

    userProfile = profileObj;
    showToast("Setup complete! Welcome to StudyOS.", "success");
    initAppUI();
  });
}

/**
 * Crash Recovery Modal (§10.3)
 */
function checkCrashRecoveryPrompt() {
  const draft = timerEngine.checkCrashRecovery();
  if (!draft) return;

  const modal = document.createElement('div');
  modal.className = 'lock-overlay';
  modal.innerHTML = `
    <div class="lock-modal">
      <h3>Unsaved Timer Session Found</h3>
      <p style="font-size:13px; color:var(--text-muted); margin:15px 0;">
        StudyOS detected an interrupted study session (${Math.round(draft.elapsedSeconds / 60)} mins elapsed).
      </p>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <button class="btn-primary" id="crash-save-btn">Save Elapsed Time</button>
        <button class="btn-secondary" id="crash-discard-btn">Discard Session</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('crash-save-btn')?.addEventListener('click', async () => {
    if (draft.elapsedSeconds >= 60) {
      await putRecord('sessions', {
        id: 'session_' + Date.now(),
        subjectId: draft.subjectId,
        startTimestamp: draft.startTimestamp,
        endTimestamp: Date.now(),
        durationSeconds: draft.elapsedSeconds,
        sessionType: draft.mode,
        schemaVersion: 1
      });
      await awardXP('STUDY_SESSION', { durationSeconds: draft.elapsedSeconds });
      showToast("Recovered session saved!", "success");
    }
    timerEngine.clearLocalStorageState();
    modal.remove();
  });

  document.getElementById('crash-discard-btn')?.addEventListener('click', () => {
    timerEngine.clearLocalStorageState();
    modal.remove();
  });
}
