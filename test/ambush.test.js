// The cornering ambush: Farmer Bramble takes a shortcut, blocks the lane ahead of Tom and swipes.
// Ducking a high swipe or jumping a low scoop slips past; standing still costs a tail feather.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../game/src/run.js';
import { startAmbush, updateAmbush } from '../game/src/ambush.js';
import { createCourse, reserveClearing, addEntity } from '../game/src/course.js';
import { createRandom } from '../game/src/random.js';
import { stageStartX } from '../game/src/stages.js';
import { STEP_SECONDS } from '../game/src/config.js';

const idle = () => ({ left: false, right: false, duck: false, jump: false, jumpPressed: false, dashPressed: false, hidePressed: false });

// Tom running through an empty barn, with the farmer already blocking the lane ahead.
function barnAmbush(high) {
  const run = createRun(7);
  run.course.entities.length = 0;
  run.course.nextX = Infinity;
  run.course.finishPlaced = true;
  run.stageIndex = 1;
  const x = stageStartX(1) + 2000;
  Object.assign(run.turkey, { x, vx: 292 });
  run.farmer.x = x - 300;
  run.camera.x = x - 370;
  run.farthestX = x;
  startAmbush(run, { high, zoneX: x + 400 });
  return run;
}

function play(run, seconds, controlsFor) {
  const events = [];
  for (let t = 0; t < seconds; t += STEP_SECONDS) {
    updateRun(run, controlsFor(run), STEP_SECONDS);
    for (const event of run.events) events.push(event.type);
  }
  return events;
}

const ahead = (run) => run.farmer.x - run.turkey.x;

test('the farmer waits ahead of Tom, facing him', () => {
  const run = barnAmbush(true);
  assert.equal(run.farmer.state, 'cornering');
  assert.equal(run.farmer.facing, -1);
  assert.ok(ahead(run) > 600, `farmer should start well ahead, was ${ahead(run)}`);
});

test('ducking under a high swipe slips past', () => {
  const run = barnAmbush(true);
  const events = play(run, 4, (r) => ({ ...idle(), duck: ahead(r) > -60 && ahead(r) < 230 }));
  assert.ok(events.includes('farmerSwipe'));
  assert.ok(events.includes('slippedPast'));
  assert.equal(run.turkey.lives, 3);
});

test('standing into a high swipe costs a feather', () => {
  const run = barnAmbush(true);
  const events = play(run, 4, idle);
  assert.ok(events.includes('farmerSwipe'));
  assert.equal(run.turkey.lives, 2);
  assert.equal(run.outcome, null);
});

test('jumping a low scoop slips past', () => {
  const run = barnAmbush(false);
  let jumped = false;
  const events = play(run, 4, (r) => {
    const press = !jumped && ahead(r) < 170 && r.turkey.onGround;
    if (press) jumped = true;
    return { ...idle(), jumpPressed: press, jump: jumped && !r.turkey.onGround };
  });
  assert.ok(events.includes('slippedPast'));
  assert.equal(run.turkey.lives, 3);
});

test('the farmer catches a Tom who loses his last feather while cornered', () => {
  const run = barnAmbush(true);
  run.turkey.lives = 1;
  play(run, 5, idle);
  assert.equal(run.outcome, 'caught');
});

test('hiding before the farmer swipes turns the ambush into a search', () => {
  const run = barnAmbush(true);
  addEntity(run.course, 'barrel', run.turkey.x + 120, { w: 82, h: 98 });
  const events = play(run, 4, (r) => ({ ...idle(), hidePressed: !r.turkey.hiddenIn && r.turkey.x > r.turkey.x - 1 && r.course.entities.some((e) => e.kind === 'barrel' && Math.abs(r.turkey.x - (e.x + e.w / 2)) < 30) }));
  assert.ok(events.includes('hide'));
  assert.ok(['approach', 'search', 'pokeWindup', 'poke'].includes(run.farmer.state), `farmer state was ${run.farmer.state}`);
});

test('an ambush the farmer is too busy to start is called off before Tom reaches it', () => {
  const run = barnAmbush(true);
  run.farmer.state = 'recover';
  run.farmer.timer = 99;
  run.farmer.x = run.turkey.x - 200;
  run.ambush = { wait: 0, zoneX: run.turkey.x + 250, phase: 'planned', high: true };
  updateAmbush(run, STEP_SECONDS);
  assert.equal(run.ambush.phase, 'none');
});

test('reserveClearing refuses a clearing that would reach a stage door', () => {
  const course = createCourse(createRandom(1));
  course.nextX = stageStartX(1) - 500;
  assert.equal(reserveClearing(course, 760), null);
});

test('reserveClearing pushes the course frontier past the clearing', () => {
  const course = createCourse(createRandom(1));
  course.nextX = stageStartX(1) + 1000;
  const start = reserveClearing(course, 760);
  assert.ok(start >= stageStartX(1) + 1000);
  assert.ok(course.nextX >= start + 760);
});
