// Corn decoys: Tom tosses a cob and the farmer can't help stopping for it, even mid-ambush.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../game/src/run.js';
import { startAmbush } from '../game/src/ambush.js';
import { throwDecoy, earnDecoysForCorn } from '../game/src/decoys.js';
import { stageStartX } from '../game/src/stages.js';
import { STEP_SECONDS } from '../game/src/config.js';

const idle = () => ({ left: false, right: false, duck: false, jump: false, jumpPressed: false, dashPressed: false, hidePressed: false, decoyPressed: false });

function emptyRun(stageIndex) {
  const run = createRun(7);
  run.course.entities.length = 0;
  run.course.nextX = Infinity;
  run.course.finishPlaced = true;
  run.stageIndex = stageIndex;
  const x = stageStartX(stageIndex) + 2000;
  Object.assign(run.turkey, { x, vx: 292 });
  run.camera.x = x - 370;
  run.farthestX = x;
  return run;
}

function play(run, seconds, controlsFor = idle) {
  const seen = { events: [], states: new Set() };
  for (let t = 0; t < seconds; t += STEP_SECONDS) {
    updateRun(run, controlsFor(run), STEP_SECONDS);
    for (const event of run.events) seen.events.push(event.type);
    seen.states.add(run.farmer.state);
  }
  return seen;
}

test('a decoy thrown behind Tom stops a chasing farmer', () => {
  const run = emptyRun(0);
  run.farmer.x = run.turkey.x - 260;
  run.farmer.throwCooldown = 99;
  assert.equal(throwDecoy(run), true);
  const seen = play(run, 2.5);
  assert.ok(seen.states.has('distracted'), `states: ${[...seen.states]}`);
  assert.ok(seen.events.includes('decoyTaken'));
});

test('a decoy beats an ambush', () => {
  const run = emptyRun(1);
  run.farmer.x = run.turkey.x - 300;
  startAmbush(run, { high: true, zoneX: run.turkey.x + 400 });
  let thrown = false;
  const seen = play(run, 4.5, (r) => {
    const press = !thrown && r.farmer.x - r.turkey.x < 300;
    if (press) thrown = true;
    return { ...idle(), decoyPressed: press };
  });
  assert.ok(seen.events.includes('decoyTaken'));
  assert.equal(run.turkey.lives, 3);
});

test('with no decoys left nothing is thrown', () => {
  const run = emptyRun(0);
  run.decoys = 0;
  assert.equal(throwDecoy(run), false);
  assert.equal(run.course.entities.filter((e) => e.kind === 'decoy').length, 0);
});

test('every 25 corn earns a decoy, up to three', () => {
  const run = emptyRun(0);
  run.decoys = 1;
  earnDecoysForCorn(run, 24, 25);
  assert.equal(run.decoys, 2);
  earnDecoysForCorn(run, 70, 76);
  assert.equal(run.decoys, 3);
  earnDecoysForCorn(run, 99, 100);
  assert.equal(run.decoys, 3);
});
