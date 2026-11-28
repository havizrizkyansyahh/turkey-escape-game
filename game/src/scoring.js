// Close-call combos: near misses in quick succession chain together, and each one in the chain
// is worth more than the last ("CLOSE CALL x3 +75").

import { SCORE_VALUES } from './config.js';

export function createCombo() {
  return { count: 0, left: 0 };
}

export function chainCloseCall(combo) {
  combo.count = combo.left > 0 ? combo.count + 1 : 1;
  combo.left = COMBO_WINDOW;
  const points = SCORE_VALUES.closeCall * combo.count;
  const label = combo.count > 1 ? `CLOSE CALL x${combo.count} +${points}` : `CLOSE CALL! +${points}`;
  return { count: combo.count, points, label };
}

export function coolCombo(combo, dt) {
  combo.left = Math.max(0, combo.left - dt);
  if (combo.left === 0) combo.count = 0;
}

export const COMBO_WINDOW = 2.5; // seconds a chain stays open after each close call
