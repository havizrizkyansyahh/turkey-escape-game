// Medals kept between runs, close-call combos, and reading old saved bests.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MEDALS, medalsEarned, mergeMedals } from '../game/src/medals.js';
import { createCombo, chainCloseCall, coolCombo } from '../game/src/scoring.js';
import { normalizeBest } from '../game/src/storage.js';

const summary = (overrides) => ({ outcome: 'caught', hits: 2, sneaks: 0, smashes: 0, hatHops: 0, ovenCloseCalls: 0, ...overrides });

test('there are six medals', () => {
  assert.equal(MEDALS.length, 6);
});

test('a clean escape earns Great Escape and No Feather Lost', () => {
  const earned = medalsEarned(summary({ outcome: 'escaped', hits: 0 }));
  assert.ok(earned.includes('greatEscape'));
  assert.ok(earned.includes('noFeatherLost'));
});

test('a caught run with no feats earns nothing', () => {
  assert.deepEqual(medalsEarned(summary({})), []);
});

test('hat hops, oven close calls, sneaks and smashes earn their medals', () => {
  const earned = medalsEarned(summary({ hatHops: 1, ovenCloseCalls: 5, sneaks: 2, smashes: 8 }));
  assert.deepEqual(earned.sort(), ['ghost', 'hatHopper', 'ovenDancer', 'smasher']);
});

test('mergeMedals reports only the medals that are new', () => {
  const { owned, fresh } = mergeMedals(['ghost'], ['ghost', 'smasher']);
  assert.deepEqual(fresh, ['smasher']);
  assert.ok(owned.includes('ghost') && owned.includes('smasher'));
  assert.equal(owned.length, 2);
});

test('three close calls inside the window chain into x3', () => {
  const combo = createCombo();
  chainCloseCall(combo);
  coolCombo(combo, 1);
  chainCloseCall(combo);
  coolCombo(combo, 1);
  const third = chainCloseCall(combo);
  assert.equal(third.count, 3);
  assert.equal(third.points, 75);
  assert.equal(third.label, 'CLOSE CALL x3 +75');
});

test('the combo resets once the window runs out', () => {
  const combo = createCombo();
  chainCloseCall(combo);
  coolCombo(combo, 3);
  assert.equal(chainCloseCall(combo).label, 'CLOSE CALL! +25');
});

test('an old saved best without medals still loads', () => {
  const best = normalizeBest({ score: 5, meters: 3, escapes: 1 });
  assert.deepEqual(best, { score: 5, meters: 3, escapes: 1, medals: [] });
});

test('unknown medal ids in a saved best are dropped', () => {
  assert.deepEqual(normalizeBest({ score: 1, medals: ['ghost', 'bogus', 7] }).medals, ['ghost']);
});
