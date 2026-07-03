/**
 * StudyOS v5 - Global Search Engine
 * Provides instant global query matching across subjects, tasks, study sessions,
 * habits, and achievements. Supports keyboard shortcuts (Cmd/Ctrl + K).
 */

import { getAll } from './db.js';

export async function executeGlobalSearch(queryText) {
  if (!queryText || queryText.trim().length === 0) {
    return { subjects: [], tasks: [], sessions: [], achievements: [] };
  }

  const q = queryText.toLowerCase().trim();

  const [subjects, tasks, sessions, achievements] = await Promise.all([
    getAll('subjects'),
    getAll('tasks'),
    getAll('sessions'),
    getAll('achievements')
  ]);

  const subjMap = new Map(subjects.map(s => [s.id, s.title]));

  // Match subjects
  const matchedSubjects = subjects.filter(s => {
    return (s.title && s.title.toLowerCase().includes(q)) ||
           (s.metadata?.notes && s.metadata.notes.toLowerCase().includes(q));
  });

  // Match tasks
  const matchedTasks = tasks.filter(t => {
    return (t.title && t.title.toLowerCase().includes(q)) ||
           (t.description && t.description.toLowerCase().includes(q)) ||
           (t.category && t.category.toLowerCase().includes(q));
  });

  // Match sessions
  const matchedSessions = sessions.filter(s => {
    const subjTitle = subjMap.get(s.subjectId) || '';
    const dateStr = new Date(s.startTimestamp).toLocaleDateString().toLowerCase();
    return subjTitle.toLowerCase().includes(q) || dateStr.includes(q);
  });

  // Match achievements
  const matchedAchievements = achievements.filter(a => {
    return a.id.toLowerCase().includes(q);
  });

  return {
    subjects: matchedSubjects,
    tasks: matchedTasks,
    sessions: matchedSessions.slice(-10),
    achievements: matchedAchievements
  };
}
