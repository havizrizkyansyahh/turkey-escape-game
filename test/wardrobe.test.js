// The wardrobe: disguises Tom unlocks with medals and wears on his runs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HATS, hatsOwned, bestHat, nextHat } from '../game/src/wardrobe.js';
import { normalizeBest } from '../game/src/storage.js';

test('there are three hats, each unlocked by a medal', () => {
  assert.equal(HATS.length, 3);
  for (const hat of HATS) assert.ok(hat.medal);
});

test('the Great Escape medal unlocks the Pilgrim Hat', () => {
  assert.deepEqual(hatsOwned(['greatEscape']), ['pilgrim']);
});

test('no medals, no hat', () => {
  assert.equal(bestHat([]), null);
});

test('the best hat is the last one unlocked in wardrobe order', () => {
  assert.equal(bestHat(['greatEscape', 'hatHopper']), 'groucho');
});

test('nextHat cycles through the owned hats and back to bare-headed', () => {
  const medals = ['greatEscape', 'hatHopper'];
  assert.equal(nextHat(null, medals), 'pilgrim');
  assert.equal(nextHat('pilgrim', medals), 'groucho');
  assert.equal(nextHat('groucho', medals), null);
});

test('a saved hat survives loading; a missing or unknown one becomes null', () => {
  assert.equal(normalizeBest({ score: 1, medals: ['greatEscape'], hat: 'pilgrim' }).hat, 'pilgrim');
  assert.equal(normalizeBest({ score: 1 }).hat, null);
  assert.equal(normalizeBest({ score: 1, hat: 'tophat' }).hat, null);
});
