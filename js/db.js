/**
 * StudyOS v5 - Primary IndexedDB Engine
 * Handles schema versioning, entity CRUD, multi-tab versionchange locking,
 * and automated database migration pipelines.
 */

const DB_NAME = 'StudyOS_DB';
const DB_VERSION = 1;
const CURRENT_SCHEMA_VERSION = 1;

let dbInstance = null;
let isMultiTabLocked = false;
const multiTabLockCallbacks = [];

export function onMultiTabLock(callback) {
  multiTabLockCallbacks.push(callback);
}

function notifyMultiTabLock() {
  isMultiTabLocked = true;
  multiTabLockCallbacks.forEach(cb => cb());
}

/**
 * Initializes IndexedDB database and handles upgrade migrations.
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not supported on this browser. StudyOS requires IndexedDB to operate."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 1. Profile Store
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'id' });
      }

      // 2. Trackable Entities / Subjects Store
      if (!db.objectStoreNames.contains('subjects')) {
        const subjectStore = db.createObjectStore('subjects', { keyPath: 'id' });
        subjectStore.createIndex('moduleType', 'moduleType', { unique: false });
        subjectStore.createIndex('archived', 'archived', { unique: false });
      }

      // 3. Study Sessions Store
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionStore.createIndex('subjectId', 'subjectId', { unique: false });
        sessionStore.createIndex('startTimestamp', 'startTimestamp', { unique: false });
      }

      // 4. Tasks Store
      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
        taskStore.createIndex('category', 'category', { unique: false });
        taskStore.createIndex('dueDate', 'dueDate', { unique: false });
        taskStore.createIndex('completed', 'completed', { unique: false });
      }

      // 5. Habits / Growth Store
      if (!db.objectStoreNames.contains('habits')) {
        db.createObjectStore('habits', { keyPath: 'id' });
      }

      // 6. XP History Store
      if (!db.objectStoreNames.contains('xp_history')) {
        const xpStore = db.createObjectStore('xp_history', { keyPath: 'id' });
        xpStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // 7. Achievements Store
      if (!db.objectStoreNames.contains('achievements')) {
        db.createObjectStore('achievements', { keyPath: 'id' });
      }

      // 8. Daily Performance Calendar Store
      if (!db.objectStoreNames.contains('calendar_days')) {
        db.createObjectStore('calendar_days', { keyPath: 'date' });
      }

      // 9. Social Reminders Store
      if (!db.objectStoreNames.contains('reminders')) {
        db.createObjectStore('reminders', { keyPath: 'id' });
      }

      // 10. Settings Store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;

      // Handle §3.4 Multi-Tab Schema Upgrade Lock
      dbInstance.onversionchange = () => {
        console.warn("[StudyOS DB] Database version change detected in another tab. Closing connection.");
        dbInstance.close();
        dbInstance = null;
        notifyMultiTabLock();
      };

      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error("[StudyOS DB] IndexedDB failed to open:", event.target.error);
      reject(event.target.error);
    };
  });
}

function getStore(storeName, mode = 'readonly') {
  if (isMultiTabLocked) {
    throw new Error("Database locked due to app version upgrade in another tab. Reload page to continue.");
  }
  if (!dbInstance) {
    throw new Error("Database not initialized.");
  }
  const tx = dbInstance.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

/**
 * Generic CRUD Helpers
 */
export async function getAll(storeName) {
  return new Promise((resolve, reject) => {
    try {
      const store = getStore(storeName, 'readonly');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function getByKey(storeName, key) {
  return new Promise((resolve, reject) => {
    try {
      const store = getStore(storeName, 'readonly');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function putRecord(storeName, record) {
  return new Promise((resolve, reject) => {
    try {
      const recordWithSchema = {
        ...record,
        schemaVersion: record.schemaVersion || CURRENT_SCHEMA_VERSION
      };
      const store = getStore(storeName, 'readwrite');
      const req = store.put(recordWithSchema);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function deleteRecord(storeName, key) {
  return new Promise((resolve, reject) => {
    try {
      const store = getStore(storeName, 'readwrite');
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function clearStore(storeName) {
  return new Promise((resolve, reject) => {
    try {
      const store = getStore(storeName, 'readwrite');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * High level export of full database for backups (§3.2)
 */
export async function exportFullDatabaseJSON() {
  const stores = ['profile', 'subjects', 'sessions', 'tasks', 'habits', 'xp_history', 'achievements', 'calendar_days', 'reminders', 'settings'];
  const exportData = {
    appName: 'StudyOS',
    appVersion: '5.0',
    dbVersion: DB_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    stores: {}
  };

  for (const storeName of stores) {
    exportData.stores[storeName] = await getAll(storeName);
  }

  return exportData;
}

/**
 * High level restore of database from JSON backup (§3.2)
 */
export async function restoreFullDatabaseJSON(importData) {
  if (!importData || !importData.stores) {
    throw new Error("Invalid StudyOS backup file structure.");
  }
  
  const stores = Object.keys(importData.stores);
  for (const storeName of stores) {
    if (dbInstance.objectStoreNames.contains(storeName)) {
      await clearStore(storeName);
      const items = importData.stores[storeName];
      for (const item of items) {
        await putRecord(storeName, item);
      }
    }
  }
  return true;
}
