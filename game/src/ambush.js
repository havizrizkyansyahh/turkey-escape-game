// The farmer corners Tom. From the barn on, Farmer Bramble sometimes stops chasing, cries
// "Shortcut!", and pops out of a side door AHEAD of Tom on a clear stretch of floor, blocking the
// lane. His arms telegraph the grab: arms up means a high swipe (duck under it), arms low means a
// scoop (jump it). Landing on his hat, or gobble-dashing into him, knocks him silly.

import { GROUND_Y, AMBUSH_TUNING as A } from './config.js';
import { STAGES } from './stages.js';
import { reserveClearing } from './course.js';
import { boxesOverlap } from './collisions.js';
import { turkeyBox } from './turkey.js';
import { sayLine } from './farmer.js';
import { spawnBurst, spawnPopup } from './particles.js';

export function cornerTurkey(run) {
  const farmer = run.farmer;
  const ambush = run.ambush;
  farmer.x = Math.max(ambush.zoneX + A.popInset, run.turkey.x + 520);
  farmer.state = 'cornering';
  farmer.timer = 0;
  farmer.vx = 0;
  farmer.facing = -1;
  farmer.ambushHigh = ambush.high;
  farmer.swipeSpent = false;
  farmer.grabbedTom = false;
  sayLine(farmer, ambush.high ? 'End of the line, drumstick!' : 'Nowhere to run, Tom!', 1.8);
  ambush.phase = 'cornering';
  run.events.push({ type: 'cornered', high: ambush.high });
  const hintKey = ambush.high ? 'ambushHigh' : 'ambushLow';
  if (!run.hintsShown.has(hintKey)) {
    run.hintsShown.add(hintKey);
    spawnPopup(run.popups, {
      text: ambush.high ? 'CORNERED! Arms up: DUCK under!' : 'CORNERED! Arms low: JUMP over!',
      x: run.turkey.x + 250,
      y: GROUND_Y - 300,
      color: '#ffe066',
      size: 20,
      life: 2.4,
      hint: true,
    });
  }
}

// Tests and screenshots: the farmer is already blocking the lane at the clearing that starts at zoneX.
export function startAmbush(run, { high, zoneX }) {
  run.ambush = { ...createAmbush(), zoneX, phase: 'planned', high, stage: run.stageIndex };
  cornerTurkey(run);
}

export function updateAmbush(run, dt) {
  planAmbush(run, dt);
  const ambush = run.ambush;
  if (ambush.phase !== 'planned') return;
  const turkey = run.turkey;
  const farmer = run.farmer;
  const toZone = ambush.zoneX - turkey.x;
  if (toZone < A.cancelWithin || turkey.hiddenIn || turkey.knockedOut || run.outcome) {
    callOff(run); // the clearing is just a breather this time
    return;
  }
  if (toZone <= A.leadIn && farmer.state === 'chase') {
    farmer.state = 'shortcut';
    farmer.timer = A.shortcutMaxSeconds;
    farmer.ambushHigh = ambush.high;
    sayLine(farmer, 'Shortcut!', 1.2);
    ambush.phase = 'shortcut';
    run.events.push({ type: 'farmerShortcut' });
  }
}

// Counts down while the farmer chases in a stage that has ambushes, then holds a clearing ahead.
export function planAmbush(run, dt) {
  const ambush = run.ambush;
  const stage = STAGES[run.stageIndex];
  if (!stage.ambushEvery || ambush.phase !== 'none' || run.outcome) return;
  if (ambush.stage !== run.stageIndex) {
    ambush.stage = run.stageIndex;
    ambush.wait = run.random.range(stage.ambushEvery[0], stage.ambushEvery[1]) * 0.6; // the first one comes sooner
  }
  if (run.farmer.state !== 'chase' || run.turkey.hiddenIn) return;
  ambush.wait -= dt;
  if (ambush.wait > 0) return;
  const zoneX = reserveClearing(run.course, A.clearing);
  if (zoneX === null) {
    ambush.wait = 1;
    return;
  }
  ambush.zoneX = zoneX;
  ambush.high = run.random.chance(0.5);
  ambush.phase = 'planned';
}

export function createAmbush() {
  return { wait: 0, zoneX: 0, phase: 'none', high: false, stage: -1 };
}

export function isAmbushState(state) {
  return AMBUSH_STATES.has(state);
}

// The farmer's side of the ambush, called from updateFarmer for the ambush states.
export function updateAmbushFarmer(farmer, run, stage, dt) {
  switch (farmer.state) {
    case 'shortcut':
      takeShortcut(farmer, run);
      break;
    case 'cornering':
      holdTheLane(farmer, run);
      break;
    case 'swipe':
      swipeAtTurkey(farmer, run);
      break;
    case 'stunned':
      farmer.vx = 0;
      if (farmer.timer <= 0) resumeChase(farmer, 'Ooh, my hat... GET BACK HERE!');
      break;
    case 'tumble':
      farmer.vx = 0;
      farmer.facing = farmer.timer < A.tumbleSeconds - 0.35 ? 1 : -1;
      if (farmer.timer <= 0) resumeChase(farmer, 'Hey! Come back here!');
      break;
    default:
      break;
  }
}

// The swipe hurts only in its band: a high swipe passes over a ducking Tom, a low scoop under a jump.
export function ambushSwipeBox(farmer) {
  return farmer.ambushHigh
    ? { x: farmer.x - 96, y: GROUND_Y - 128, w: 120, h: 90 }
    : { x: farmer.x - 96, y: GROUND_Y - 64, w: 120, h: 64 };
}

function takeShortcut(farmer, run) {
  farmer.vx = 0;
  farmer.facing = -1;
  if (run.turkey.hiddenIn || run.turkey.knockedOut) {
    farmer.state = 'chase';
    callOff(run);
    return;
  }
  const offscreen = farmer.x < run.camera.x - 170;
  if (offscreen || farmer.timer <= 0) cornerTurkey(run);
}

function holdTheLane(farmer, run) {
  const turkey = run.turkey;
  farmer.facing = -1;
  farmer.vx = 0;
  if (turkey.hiddenIn) {
    farmer.searchSpot = turkey.hiddenIn;
    farmer.state = 'approach';
    callOff(run);
    return;
  }
  if (turkey.knockedOut) {
    walkToKnockedOutTurkey(farmer, run);
    return;
  }
  if (hatHop(farmer, run) || bowledOver(farmer, run) || slippedPast(farmer, run)) return;
  const ahead = farmer.x - turkey.x;
  if (!farmer.swipeSpent && ahead < A.swipeReach && turkey.invulnerable <= 0) {
    farmer.state = 'swipe';
    farmer.timer = A.swipeSeconds;
    farmer.swipeSpent = true;
    sayLine(farmer, 'GOTCHA!', 0.8);
    run.events.push({ type: 'farmerSwipe', high: farmer.ambushHigh });
  }
}

function swipeAtTurkey(farmer, run) {
  const turkey = run.turkey;
  farmer.facing = -1;
  farmer.vx = 0;
  if (hatHop(farmer, run) || bowledOver(farmer, run)) return;
  const grabbable = !turkey.hiddenIn && !turkey.caught && turkey.invulnerable <= 0;
  if (grabbable && boxesOverlap(ambushSwipeBox(farmer), turkeyBox(turkey))) {
    farmer.grabbedTom = true;
    run.onTurkeyGrabbed();
  }
  if (farmer.timer <= 0) farmer.state = 'cornering';
}

function walkToKnockedOutTurkey(farmer, run) {
  const gap = farmer.x - run.turkey.x;
  farmer.vx = gap > 0 ? -A.walkBackSpeed : A.walkBackSpeed;
  farmer.facing = gap > 0 ? -1 : 1;
  if (Math.abs(gap) < 70) run.onTurkeyCaught('cornered');
}

// Tom came down on the farmer's hat: a bounce, and the farmer sees stars.
function hatHop(farmer, run) {
  const turkey = run.turkey;
  const onHat = turkey.vy > 0 && turkey.y > GROUND_Y - 205 && turkey.y < GROUND_Y - 165 && Math.abs(turkey.x - farmer.x) < 34;
  if (!onHat) return false;
  turkey.vy = -A.hatHopBounce;
  turkey.flutterUsed = false;
  turkey.jumpCut = true;
  run.stats.hatHops += 1;
  run.award(150, 'HAT HOP! +150', turkey.x, GROUND_Y - 260, '#7bc950', 28);
  knockSilly(farmer, run, 'hatHop');
  return true;
}

// A gobble-dash straight through his legs.
function bowledOver(farmer, run) {
  const turkey = run.turkey;
  if (turkey.dashLeft <= 0) return false;
  const body = { x: farmer.x - 30, y: GROUND_Y - 190, w: 60, h: 190 };
  if (!boxesOverlap(body, turkeyBox(turkey))) return false;
  run.award(120, 'BOWLED OVER! +120', turkey.x, GROUND_Y - 230, '#ffb347', 26);
  knockSilly(farmer, run, 'bowledOver');
  return true;
}

function slippedPast(farmer, run) {
  const turkey = run.turkey;
  if (turkey.x < farmer.x + 40) return false;
  if (!farmer.grabbedTom) run.award(100, 'SLIPPED PAST! +100', turkey.x, GROUND_Y - 200, '#7bc950', 24);
  farmer.state = 'tumble';
  farmer.timer = A.tumbleSeconds;
  sayLine(farmer, farmer.grabbedTom ? 'Just a FEATHER?!' : 'Whoa! Slippery bird!', 1.4);
  run.events.push({ type: 'slippedPast' });
  finish(run);
  return true;
}

function knockSilly(farmer, run, eventType) {
  farmer.state = 'stunned';
  farmer.timer = A.stunSeconds;
  sayLine(farmer, 'Ooof!', 1.0);
  spawnBurst(run.particles, run.effectsRandom, { x: farmer.x, y: GROUND_Y - 200, count: 10, kind: 'star', colors: ['#ffe066', '#fff6c9'], speed: 160, life: 0.8, size: 8, gravity: 0 });
  run.events.push({ type: eventType });
  finish(run);
}

function resumeChase(farmer, line) {
  farmer.state = 'chase';
  farmer.timer = 0;
  farmer.swipeSpent = false;
  farmer.grabbedTom = false;
  sayLine(farmer, line, 1.4);
}

function finish(run) {
  const ambush = run.ambush;
  const stage = STAGES[run.stageIndex];
  ambush.phase = 'none';
  ambush.wait = stage.ambushEvery ? run.random.range(stage.ambushEvery[0], stage.ambushEvery[1]) : 0;
}

function callOff(run) {
  finish(run);
  run.ambush.wait = Math.min(run.ambush.wait, 4);
}

const AMBUSH_STATES = new Set(['shortcut', 'cornering', 'swipe', 'stunned', 'tumble']);
