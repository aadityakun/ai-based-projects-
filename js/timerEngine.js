/**
 * StudyOS v5 - Timer Engine
 * Timestamp-driven timer core using monotonic performance.now() and Date.now() wall-clock timing.
 * Implements clock-tampering detection, 30s crash-resilient auto-save, wake lock API,
 * 60s minimum threshold, and 10-minute pause/resume continuity logic.
 */

export const TIMER_MODES = {
  POMODORO: 'POMODORO',
  COUNTDOWN: 'COUNTDOWN',
  STOPWATCH: 'STOPWATCH'
};

export const TIMER_STATES = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  FINISHED: 'FINISHED'
};

class TimerEngine {
  constructor() {
    this.mode = TIMER_MODES.POMODORO; // Default to Pomodoro 25m
    this.state = TIMER_STATES.IDLE;
    this.subjectId = null;
    this.targetSeconds = 25 * 60; // Default 25 minutes
    
    // Monotonic & Wall-clock timestamps
    this.sessionStartMonotonic = 0;
    this.startTimestamp = 0;
    this.pauseMonotonicStart = 0;
    this.totalAccumulatedPauseTime = 0;
    this.pausedAtWallClock = 0;
    
    // Auto-save & background interval
    this.autoSaveInterval = null;
    this.tickInterval = null;
    
    // Clock tampering state
    this.suspendedWallTimestamp = 0;
    this.isClockTampered = false;
    
    // Wake Lock
    this.wakeLockSentinel = null;
    
    // Event listeners
    this.listeners = new Set();

    this.initVisibilityListener();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const data = this.getStatus();
    this.listeners.forEach(fn => fn(data));
  }

  setMode(mode, targetMinutes = 25) {
    this.mode = mode;
    if (mode === TIMER_MODES.POMODORO) {
      this.targetSeconds = 25 * 60;
    } else if (mode === TIMER_MODES.COUNTDOWN) {
      this.targetSeconds = targetMinutes * 60;
    } else {
      this.targetSeconds = 0;
    }
    this.notify();
  }

  initVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (this.state === TIMER_STATES.RUNNING) {
          this.suspendedWallTimestamp = Date.now();
        }
      } else if (document.visibilityState === 'visible') {
        if (this.state === TIMER_STATES.RUNNING && this.suspendedWallTimestamp > 0) {
          const resumedWallTimestamp = Date.now();
          
          // §10.2 Clock-Tampering Check
          if (resumedWallTimestamp < this.suspendedWallTimestamp) {
            console.warn("[StudyOS Timer] Clock tampering or DST backward shift detected!");
            this.pause();
            this.isClockTampered = true;
            this.notify();
            return;
          }
          this.suspendedWallTimestamp = 0;
          this.notify();
        }
      }
    });
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator && !this.wakeLockSentinel) {
        this.wakeLockSentinel = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.info("[StudyOS Timer] Wake Lock not available or rejected:", err.message);
    }
  }

  releaseWakeLock() {
    if (this.wakeLockSentinel) {
      this.wakeLockSentinel.release().catch(() => {});
      this.wakeLockSentinel = null;
    }
  }

  getElapsedSeconds() {
    if (this.state === TIMER_STATES.IDLE) return 0;
    
    let nowMonotonic = performance.now();
    let currentPauseAccum = this.totalAccumulatedPauseTime;
    
    if (this.state === TIMER_STATES.PAUSED) {
      currentPauseAccum += (nowMonotonic - this.pauseMonotonicStart);
    }

    const elapsedMs = Math.max(0, nowMonotonic - this.sessionStartMonotonic - currentPauseAccum);
    return Math.floor(elapsedMs / 1000);
  }

  getRemainingSeconds() {
    if (this.mode === TIMER_MODES.STOPWATCH) return 0;
    if (this.state === TIMER_STATES.IDLE) return this.targetSeconds;
    const elapsed = this.getElapsedSeconds();
    return Math.max(0, this.targetSeconds - elapsed);
  }

  getStatus() {
    const elapsed = this.getElapsedSeconds();
    const remaining = this.getRemainingSeconds();
    let progressPct = 0;

    if (this.mode !== TIMER_MODES.STOPWATCH && this.targetSeconds > 0) {
      progressPct = Math.min(100, Math.round((elapsed / this.targetSeconds) * 100));
    }

    return {
      state: this.state,
      mode: this.mode,
      subjectId: this.subjectId,
      elapsedSeconds: elapsed,
      remainingSeconds: remaining,
      targetSeconds: this.targetSeconds,
      progressPct: progressPct,
      isClockTampered: this.isClockTampered,
      startTimestamp: this.startTimestamp
    };
  }

  start(subjectId, mode = TIMER_MODES.POMODORO, targetMinutes = 25) {
    this.subjectId = subjectId;
    this.mode = mode;
    this.targetSeconds = mode === TIMER_MODES.STOPWATCH ? 0 : targetMinutes * 60;
    this.state = TIMER_STATES.RUNNING;
    this.isClockTampered = false;

    this.sessionStartMonotonic = performance.now();
    this.startTimestamp = Date.now();
    this.totalAccumulatedPauseTime = 0;

    this.requestWakeLock();
    this.startIntervals();
    this.notify();
  }

  pause() {
    if (this.state !== TIMER_STATES.RUNNING) return;
    
    this.state = TIMER_STATES.PAUSED;
    this.pauseMonotonicStart = performance.now();
    this.pausedAtWallClock = Date.now();

    this.releaseWakeLock();
    this.saveStateToLocalStorage();
    this.notify();
  }

  resume() {
    if (this.state !== TIMER_STATES.PAUSED) return;

    const nowWall = Date.now();
    const pauseDurationSeconds = Math.floor((nowWall - this.pausedAtWallClock) / 1000);

    let requiresNewSession = false;
    if (pauseDurationSeconds > 600) {
      requiresNewSession = true;
    }

    const nowMonotonic = performance.now();
    this.totalAccumulatedPauseTime += (nowMonotonic - this.pauseMonotonicStart);
    this.pauseMonotonicStart = 0;
    this.state = TIMER_STATES.RUNNING;
    this.isClockTampered = false;

    this.requestWakeLock();
    this.saveStateToLocalStorage();
    this.notify();

    return { requiresNewSession, pauseDurationSeconds };
  }

  stop() {
    const finalElapsed = this.getElapsedSeconds();
    const startTs = this.startTimestamp;
    const subjId = this.subjectId;
    const mode = this.mode;

    this.reset();
    this.clearLocalStorageState();

    return {
      subjectId: subjId,
      mode: mode,
      elapsedSeconds: finalElapsed,
      startTimestamp: startTs,
      endTimestamp: Date.now(),
      isValid: finalElapsed >= 60
    };
  }

  reset() {
    this.state = TIMER_STATES.IDLE;
    this.mode = TIMER_MODES.POMODORO;
    this.subjectId = null;
    this.targetSeconds = 25 * 60;
    this.sessionStartMonotonic = 0;
    this.startTimestamp = 0;
    this.pauseMonotonicStart = 0;
    this.totalAccumulatedPauseTime = 0;
    this.pausedAtWallClock = 0;
    this.isClockTampered = false;

    this.stopIntervals();
    this.releaseWakeLock();
    this.notify();
  }

  startIntervals() {
    this.stopIntervals();
    this.tickInterval = setInterval(() => {
      if (this.state === TIMER_STATES.RUNNING) {
        if (this.mode !== TIMER_MODES.STOPWATCH && this.getRemainingSeconds() <= 0) {
          this.state = TIMER_STATES.FINISHED;
          this.notify();
        } else {
          this.notify();
        }
      }
    }, 500);

    this.autoSaveInterval = setInterval(() => {
      if (this.state === TIMER_STATES.RUNNING || this.state === TIMER_STATES.PAUSED) {
        this.saveStateToLocalStorage();
      }
    }, 30000);
  }

  stopIntervals() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
    this.tickInterval = null;
    this.autoSaveInterval = null;
  }

  saveStateToLocalStorage() {
    try {
      const stateObj = {
        mode: this.mode,
        state: this.state,
        subjectId: this.subjectId,
        targetSeconds: this.targetSeconds,
        elapsedSeconds: this.getElapsedSeconds(),
        startTimestamp: this.startTimestamp,
        pausedAtWallClock: this.pausedAtWallClock,
        lastSavedAt: Date.now()
      };
      localStorage.setItem('studyOS_active_timer_draft', JSON.stringify(stateObj));
    } catch (e) {
      console.error("[StudyOS Timer] Failed to auto-save timer state:", e);
    }
  }

  clearLocalStorageState() {
    localStorage.removeItem('studyOS_active_timer_draft');
  }

  checkCrashRecovery() {
    try {
      const raw = localStorage.getItem('studyOS_active_timer_draft');
      if (!raw) return null;
      const draft = JSON.parse(raw);
      if (draft && draft.elapsedSeconds >= 5) {
        return draft;
      }
    } catch (e) {}
    return null;
  }
}

export const timerEngine = new TimerEngine();
