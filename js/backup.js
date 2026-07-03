/**
 * StudyOS v5 - Backup, Restore & Data Export Manager
 * Supports full JSON backups with schema verification, CSV exports for sessions/tasks,
 * and clean formatted printable PDF/HTML report generators.
 */

import { exportFullDatabaseJSON, restoreFullDatabaseJSON, getAll } from './db.js';

/**
 * Downloads a text/blob file in browser
 */
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports full JSON backup (§3.2)
 */
export async function downloadJSONBackup() {
  const data = await exportFullDatabaseJSON();
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `StudyOS_Backup_${dateStr}.json`;
  const jsonStr = JSON.stringify(data, null, 2);
  downloadFile(filename, jsonStr, 'application/json');
}

/**
 * Restores JSON backup file (§3.2)
 */
export async function restoreJSONBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.appName || parsed.appName !== 'StudyOS') {
          throw new Error("Invalid backup file: Not a StudyOS backup.");
        }
        await restoreFullDatabaseJSON(parsed);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read backup file."));
    reader.readAsText(file);
  });
}

/**
 * Exports Study Sessions to CSV format
 */
export async function exportSessionsCSV() {
  const sessions = await getAll('sessions');
  const subjects = await getAll('subjects');
  const subjMap = new Map(subjects.map(s => [s.id, s.title]));

  const headers = ['Session ID', 'Subject', 'Mode', 'Start Time', 'End Time', 'Duration (mins)', 'XP Earned'];
  const rows = sessions.map(s => [
    s.id,
    `"${subjMap.get(s.subjectId) || 'General'}"`,
    s.sessionType || 'STOPWATCH',
    new Date(s.startTimestamp).toISOString(),
    new Date(s.endTimestamp).toISOString(),
    Math.round((s.durationSeconds || 0) / 60),
    s.xpEarned || 0
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(`StudyOS_Sessions_${dateStr}.csv`, csvContent, 'text/csv;charset=utf-8;');
}

/**
 * Exports Tasks to CSV format
 */
export async function exportTasksCSV() {
  const tasks = await getAll('tasks');
  const headers = ['Task ID', 'Title', 'Category', 'Priority', 'Due Date', 'Status', 'Completed Time'];
  
  const rows = tasks.map(t => [
    t.id,
    `"${(t.title || '').replace(/"/g, '""')}"`,
    t.category || 'Study',
    t.priority || 'medium',
    t.dueDate || '',
    t.completed ? 'Completed' : 'Pending',
    t.completedTimestamp ? new Date(t.completedTimestamp).toISOString() : ''
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(`StudyOS_Tasks_${dateStr}.csv`, csvContent, 'text/csv;charset=utf-8;');
}

/**
 * Generates a clean printable HTML/PDF report window
 */
export async function generatePDFReport() {
  const profile = (await getAll('profile'))[0] || {};
  const sessions = await getAll('sessions');
  const tasks = await getAll('tasks');
  const achievements = await getAll('achievements');

  const totalStudySecs = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const totalHours = (totalStudySecs / 3600).toFixed(1);
  const completedTasksCount = tasks.filter(t => t.completed).length;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Please allow popups to generate the printable PDF report.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>StudyOS Productivity Report - ${profile.username || 'User'}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1b4332; line-height: 1.6; }
        h1 { color: #1b4332; border-bottom: 2px solid #2d6a4f; padding-bottom: 10px; }
        .header-meta { font-size: 14px; color: #555; margin-bottom: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
        .stat-card { background: #f4fbf7; border: 1px solid #d8f3dc; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-val { font-size: 24px; font-weight: bold; color: #2d6a4f; }
        .stat-lbl { font-size: 12px; text-transform: uppercase; color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
        th { background: #2d6a4f; color: white; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #2d6a4f; color: white; border: none; border-radius: 6px; cursor: pointer;">Print / Save as PDF</button>
      </div>
      <h1>StudyOS Executive Productivity Summary</h1>
      <div class="header-meta">
        <strong>User:</strong> ${profile.username || 'Student'} | 
        <strong>Generated:</strong> ${new Date().toLocaleDateString()} | 
        <strong>Total XP:</strong> ${profile.totalXP || 0}
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-val">${totalHours}h</div>
          <div class="stat-lbl">Study Time</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${sessions.length}</div>
          <div class="stat-lbl">Study Sessions</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${completedTasksCount}</div>
          <div class="stat-lbl">Tasks Completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${achievements.length}</div>
          <div class="stat-lbl">Achievements</div>
        </div>
      </div>

      <h2>Recent Study Sessions</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Duration</th>
            <th>Type</th>
            <th>XP Earned</th>
          </tr>
        </thead>
        <tbody>
          ${sessions.slice(-15).reverse().map(s => `
            <tr>
              <td>${new Date(s.startTimestamp).toLocaleString()}</td>
              <td>${Math.round(s.durationSeconds / 60)} mins</td>
              <td>${s.sessionType || 'STOPWATCH'}</td>
              <td>+${s.xpEarned || 0} XP</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
