// Screenshot staging. ?shot=<name> builds one exact scene with the game's own code — the same run
// state, painters and HUD a player sees — and freezes it, so tools/capture-screenshots.ts can take
// a real render of it.

import { GROUND_Y } from './config.js';
import { stageStartX } from './stages.js';
import { createRun } from './run.js';
import { addEntity } from './course.js';
import { spawnPopup, spawnBurst } from './particles.js';
import { sayLine } from './farmer.js';

const SAMPLE_BEST = { score: 8640, meters: 1600, escapes: 2 };

function freshRun(game, stageIndex, time) {
  const run = createRun(game.seed);
  run.course.entities.length = 0;
  run.course.nextX = Infinity;
  run.course.finishPlaced = true;
  run.stageIndex = stageIndex;
  run.stageBannerLeft = 0;
  run.time = time;
  game.run = run;
  game.screen = 'playing';
  return run;
}

function cornArcAt(run, centerX, peak, count) {
  for (let i = 0; i < count; i += 1) {
    const dx = (i - (count - 1) / 2) * 32;
    const feet = Math.max(0, peak - (dx * dx) / 75);
    addEntity(run.course, 'corn', centerX + dx - 9, { w: 18, h: 26, y: GROUND_Y - feet - 30 });
  }
}

// The cover: Grandma's kitchen. Tom has just fluttered clear of Old Bertha's blast, a carving knife
// is whizzing after him, and Farmer Bramble is raising the next one.
function stageKitchenChase(game) {
  const run = freshRun(game, 2, 23.7);
  const baseX = stageStartX(2) + 3700;
  run.camera.x = baseX - 430;
  addEntity(run.course, 'oven', baseX - 40, { w: 150, h: 152, phase: 'blast', timer: 0.55, idleSeconds: 2, flameHeight: 60 });
  addEntity(run.course, 'pot', baseX + 380, { w: 66, h: 50, phase: 'rattle', timer: 0.3, idleSeconds: 2 });
  cornArcAt(run, baseX + 413, 118, 3);
  addEntity(run.course, 'rollingPin', baseX + 520, { w: 72, h: 24, rolling: true, angle: 1.2, speed: 200 });
  const turkey = run.turkey;
  Object.assign(turkey, { x: baseX + 236, y: GROUND_Y - 84, onGround: false, vy: -40, flutterLeft: 0.3, flutterUsed: true, flapPhase: 1.9, runPhase: 2, vx: 330, lives: 2, meter: 74 });
  run.spawnKnife(baseX - 150, true);
  run.popups.length = 0; // no first-knife hint in the photo
  const farmer = run.farmer;
  Object.assign(farmer, { x: baseX - 330, state: 'aim', aimHigh: false, facing: 1, vx: 280, runPhase: 4.2 });
  sayLine(farmer, 'Hold still for the carving!', 2);
  run.score = 4865;
  run.farthestX = turkey.x;
  run.stats.corn = 168;
  spawnPopup(run.popups, { text: 'CLOSE CALL! +25', x: turkey.x + 10, y: turkey.y - 108, color: '#ffe066', size: 20, life: 0.9 });
  run.popups[0].maxLife = 1.1;
  spawnBurst(run.particles, run.effectsRandom, { x: baseX + 40, y: GROUND_Y - 50, count: 12, kind: 'spark', colors: ['#ffe9a0', '#ffd166'], speed: 140, life: 0.8, size: 4, gravity: -60 });
  spawnBurst(run.particles, run.effectsRandom, { x: turkey.x - 30, y: turkey.y - 30, count: 5, kind: 'feather', colors: ['#b5652f', '#f7e2b8'], speed: 90, life: 1.2, size: 7, gravity: 60 });
}

// Tom hides in a haystack while the farmer, hand over his eyes, looks the wrong way.
function stageHaystackHide(game) {
  const run = freshRun(game, 0, 41.3);
  const baseX = 8200;
  run.camera.x = baseX - 420;
  const haystack = addEntity(run.course, 'haystack', baseX, { w: 136, h: 118, used: true, occupied: true });
  addEntity(run.course, 'chicken', baseX - 250, { w: 36, h: 36, wander: 1.0, look: 0 });
  addEntity(run.course, 'pumpkin', baseX - 330, { w: 50, h: 44, look: 1 });
  for (let i = 0; i < 4; i += 1) addEntity(run.course, 'corn', baseX + 190 + i * 34, { w: 18, h: 26, y: GROUND_Y - 30 });
  addEntity(run.course, 'haybale', baseX + 360, { w: 74, h: 54 });
  addEntity(run.course, 'fence', baseX + 520, { w: 78, h: 62, sign: true });
  const turkey = run.turkey;
  Object.assign(turkey, { x: baseX + 68, vx: 0, hiddenIn: haystack, lives: 3, meter: 58 });
  const farmer = run.farmer;
  Object.assign(farmer, { x: baseX + 68 - 96, state: 'search', lookingAtSpot: false, facing: -1, vx: 0, timer: 0.6, looksLeft: 2, searchSpot: haystack });
  sayLine(farmer, 'Here, birdy birdy...', 2);
  run.score = 1240;
  run.farthestX = turkey.x;
  run.stats.hides = 1;
}

// The barn: Tom ducks under a low beam with pitchforks ahead.
function stageBarnDuck(game) {
  const run = freshRun(game, 1, 66.2);
  const baseX = stageStartX(1) + 2600;
  run.camera.x = baseX - 400;
  addEntity(run.course, 'beam', baseX - 40, { w: 120, h: 30, clearance: 40 });
  addEntity(run.course, 'pitchforks', baseX + 260, { w: 66, h: 36 });
  addEntity(run.course, 'barrel', baseX + 420, { w: 82, h: 98 });
  addEntity(run.course, 'lantern', baseX + 140, { w: 60, h: 40, rope: 238, swing: 1.2, phaseOffset: 0.4 });
  const turkey = run.turkey;
  Object.assign(turkey, { x: baseX + 20, ducking: true, vx: 300, runPhase: 1.3, lives: 3, meter: 40 });
  Object.assign(run.farmer, { x: baseX - 260, state: 'windup', facing: 1, vx: 160, runPhase: 2 });
  sayLine(run.farmer, "C'mere, drumstick!", 2);
  run.score = 2710;
  run.farthestX = turkey.x;
}

function sampleSummary(outcome) {
  const escaped = outcome === 'escaped';
  return {
    outcome,
    reason: escaped ? null : 'grabbed',
    score: escaped ? 8640 : 3120,
    meters: escaped ? 1600 : 912,
    stageIndex: escaped ? 3 : 2,
    stageTitle: escaped ? 'The Front Porch' : "Grandma's Kitchen",
    livesLeft: escaped ? 2 : 0,
    seconds: escaped ? 214 : 131,
    corn: escaped ? 286 : 151,
    sneaks: escaped ? 2 : 1,
    hides: 2,
    closeCalls: escaped ? 24 : 11,
    hits: escaped ? 1 : 3,
    dashes: 9,
    smashes: 4,
    rank: escaped ? 'Barnyard Legend' : 'Kitchen Fugitive',
    newBest: escaped,
  };
}

const SHOTS = {
  title(game) {
    game.screen = 'title';
    game.time = 1.25;
    game.best = { ...SAMPLE_BEST };
  },
  kitchen: stageKitchenChase,
  hide: stageHaystackHide,
  barn: stageBarnDuck,
  escaped(game) {
    game.screen = 'ended';
    game.time = 1.6;
    game.best = { ...SAMPLE_BEST };
    game.summary = sampleSummary('escaped');
  },
  caught(game) {
    game.screen = 'ended';
    game.time = 1.6;
    game.best = { ...SAMPLE_BEST };
    game.summary = sampleSummary('caught');
  },
};

export function stageShot(game, name) {
  (SHOTS[name] ?? SHOTS.title)(game);
}
