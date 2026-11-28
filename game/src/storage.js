// The best score, the longest run, the number of escapes and the medals won, kept in localStorage
// between visits when the browser allows it.

import { isMedalId } from './medals.js';

export function loadBest() {
  try {
    return normalizeBest(JSON.parse(localStorage.getItem(BEST_KEY) ?? 'null'));
  } catch {
    return emptyBest(); // unreadable or blocked storage: start fresh
  }
}

export function saveBest(best) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    // storage may be switched off; the best score then lasts this visit only
  }
}

// Reads a saved record, including ones from before medals existed.
export function normalizeBest(saved) {
  if (!saved || !Number.isFinite(saved.score)) return emptyBest();
  const medals = Array.isArray(saved.medals) ? saved.medals.filter(isMedalId) : [];
  return { score: saved.score, meters: saved.meters || 0, escapes: saved.escapes || 0, medals };
}

export function emptyBest() {
  return { score: 0, meters: 0, escapes: 0, medals: [] };
}

const BEST_KEY = 'not-on-the-menu.best.v1';
