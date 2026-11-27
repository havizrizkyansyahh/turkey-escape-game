// The best score, the longest run and the number of escapes, kept in localStorage between visits
// when the browser allows it.

const BEST_KEY = 'not-on-the-menu.best.v1';

export function emptyBest() {
  return { score: 0, meters: 0, escapes: 0 };
}

export function loadBest() {
  try {
    const saved = JSON.parse(localStorage.getItem(BEST_KEY) ?? 'null');
    if (saved && Number.isFinite(saved.score)) {
      return { score: saved.score, meters: saved.meters || 0, escapes: saved.escapes || 0 };
    }
  } catch {
    // unreadable or blocked storage: start fresh
  }
  return emptyBest();
}

export function saveBest(best) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    // storage may be switched off; the best score then lasts this visit only
  }
}
