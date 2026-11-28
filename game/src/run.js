// One run of the chase: Tom, Farmer Bramble, the course ahead and the score, plus every rule that
// ties them together — hiding and sneaking out, stumbles, hits, close calls, stage doors, the
// escape into the woods and getting caught.

import { GROUND_Y, PIXELS_PER_METER, ROUTE_END_X, SCORE_VALUES as S, TURKEY_TUNING as T, FARMER_TUNING, VIEW_WIDTH } from './config.js';
import { STAGES, stageIndexAt } from './stages.js';
import { createRandom } from './random.js';
import { createCourse, extendCourse, pruneCourse, isHidingSpot } from './course.js';
import { hitboxesOf, updateEntity, SMASHABLE } from './hazards.js';
import { boxesOverlap, growBox } from './collisions.js';
import { clamp } from './numbers.js';
import { createTurkey, updateTurkey, turkeyBox, stumbleTurkey, hurtTurkey } from './turkey.js';
import { createFarmer, updateFarmer, startleFarmer, spotTurkey, farmerGivesUp, farmerCelebrates } from './farmer.js';
import { createAmbush, updateAmbush } from './ambush.js';
import { createCombo, chainCloseCall, coolCombo } from './scoring.js';
import { spawnBurst, spawnPopup, updateEffects } from './particles.js';
import { createCamera, followTurkey, shakeCamera } from './camera.js';

const FEATHER_COLORS = ['#7b4a2b', '#b5652f', '#e89a3c', '#f7e2b8', '#5b3520'];
const HAY_COLORS = ['#e5b84f', '#f6d77d', '#c18f2c'];
const PUMPKIN_COLORS = ['#e8772e', '#b8541c', '#f2a65a', '#6e8b3d'];
const MUD_COLORS = ['#6b4423', '#4f311a', '#8a5a33'];
const SPARK_COLORS = ['#fff3b0', '#ffd166', '#ffffff'];
const LEAF_COLORS = ['#c8432d', '#e8862f', '#f2c14e', '#a33b20'];

const HURT_WORDS = {
  pitchforks: 'OW! POINTY!',
  oven: 'HOT HOT HOT!',
  pot: 'SCALDED!',
  rollingPin: 'WHAM!',
  knife: 'YIKES!',
};

// The first time each kind of obstacle comes up, a floating hint says how to beat it.
const HINTS = {
  haybale: 'SPACE or CLICK to jump!',
  fence: 'Hold SPACE to jump higher',
  mud: 'Mud slows you: jump it!',
  pumpkin: 'SHIFT gobble-dash smashes pumpkins!',
  chicken: 'Watch the chickens!',
  haystack: 'Press E to hide in the haystack!',
  beam: 'Hold DOWN or S to duck!',
  baleStack: 'Too tall? Tap SPACE again mid-air to flutter!',
  pitchforks: 'Pitchforks hurt! Jump them!',
  barrel: 'Press E to hide in the barrel',
  lantern: 'Duck the swinging lantern',
  oven: 'Oven blast! Pass it shut, or flutter over',
  pot: 'Jump the pot between boil-overs',
  rollingPin: 'Rolling pin! Jump it!',
  table: 'Duck under the tablecloth!',
  pantry: 'Press E to hide in the pantry',
  rockingChair: 'Hop the rocking chairs!',
};

export function createRun(seed) {
  const turkey = createTurkey(T.startX);
  turkey.vx = STAGES[0].runSpeed;
  const run = {
    seed,
    time: 0,
    random: createRandom(seed),
    effectsRandom: createRandom(seed ^ 0x2f6b1c3d),
    turkey,
    farmer: createFarmer(turkey.x - FARMER_TUNING.startGap),
    course: createCourse(createRandom(Math.imul(seed, 7) + 13)),
    camera: createCamera(turkey.x - T.screenX),
    particles: [],
    popups: [],
    events: [],
    stageIndex: 0,
    stageBannerLeft: 3.2,
    score: 0,
    farthestX: turkey.x,
    stats: { corn: 0, sneaks: 0, hides: 0, closeCalls: 0, hits: 0, dashes: 0, smashes: 0, hatHops: 0, ovenCloseCalls: 0 },
    ambush: createAmbush(),
    combo: createCombo(),
    hintsShown: new Set(),
    outcome: null,
    outcomeReason: null,
    endDelay: 0,
    finished: false,
  };
  run.spawnKnife = (x, high) => throwKnife(run, x, high);
  run.knifeLaneClear = (gap) => knifeLaneClear(run, gap);
  run.onTurkeyCaught = (reason) => catchTurkey(run, reason);
  run.onSpotPoked = (spot) => pokeHidingSpot(run, spot);
  run.onTurkeyGrabbed = () => grabTurkey(run);
  run.award = (points, label, x, y, color, size) => addScore(run, points, label, x, y, color, size);
  extendCourse(run.course, run.camera.x + VIEW_WIDTH + 900);
  return run;
}

function addScore(run, points, label, x, y, color = '#ffd166', size = 22) {
  run.score += points;
  if (label) spawnPopup(run.popups, { text: label, x, y, color, size });
}

function burst(run, options) {
  spawnBurst(run.particles, run.effectsRandom, options);
}

function featherPuff(run, count) {
  const turkey = run.turkey;
  burst(run, { x: turkey.x, y: turkey.y - 34, count, kind: 'feather', colors: FEATHER_COLORS, speed: 260, life: 1.2, size: 7, gravity: 260 });
}

export function farmerGap(run) {
  return run.turkey.x - run.farmer.x;
}

// 0 when the farmer is comfortably far, 1 when he is about to grab (from behind, or blocking the
// lane ahead in an ambush).
export function dangerLevel(run) {
  if (run.outcome || run.turkey.hiddenIn) return 0;
  const state = run.farmer.state;
  if (state === 'cornering' || state === 'swipe') return clamp((520 - (run.farmer.x - run.turkey.x)) / 360, 0, 1);
  if (state === 'shortcut' || state === 'stunned' || state === 'tumble') return 0;
  return clamp((420 - farmerGap(run)) / 270, 0, 1);
}

// ---------------------------------------------------------------- hiding

export function hidingSpotUnderTurkey(run) {
  const turkey = run.turkey;
  for (const entity of run.course.entities) {
    if (!isHidingSpot(entity) || entity.used) continue;
    if (turkey.x > entity.x - 12 && turkey.x < entity.x + entity.w + 12) return entity;
  }
  return null;
}

function hideTurkey(run, spot) {
  const turkey = run.turkey;
  spot.used = true;
  spot.occupied = true;
  turkey.hiddenIn = spot;
  turkey.x = spot.x + spot.w / 2;
  turkey.vx = 0;
  turkey.dashLeft = 0;
  turkey.sneakBoostLeft = 0;
  turkey.stumbleLeft = 0;
  run.stats.hides += 1;
  addScore(run, S.hide, `HIDDEN! +${S.hide}`, turkey.x, GROUND_Y - spot.h - 24, '#f6d77d');
  const strawy = spot.kind === 'haystack';
  burst(run, {
    x: turkey.x,
    y: GROUND_Y - spot.h * 0.6,
    count: 14,
    kind: strawy ? 'straw' : 'dust',
    colors: strawy ? HAY_COLORS : ['#c9b79c', '#e8dcc6'],
    speed: 180,
    life: 0.7,
  });
  run.events.push({ type: 'hide', spot: spot.kind });
}

function leaveHidingSpot(run, stage) {
  const turkey = run.turkey;
  const farmer = run.farmer;
  const spot = turkey.hiddenIn;
  spot.occupied = false;
  turkey.hiddenIn = null;
  turkey.vx = stage.runSpeed * 0.7;
  if (farmer.state === 'search' && !farmer.lookingAtSpot) {
    startleFarmer(farmer, run);
    turkey.sneakBoostLeft = T.sneakBoostSeconds;
    run.stats.sneaks += 1;
    addScore(run, S.sneak, `SNEAKY! +${S.sneak}`, turkey.x, GROUND_Y - 130, '#7bc950', 28);
    run.events.push({ type: 'sneak' });
  } else if (farmer.state === 'search' || farmer.state === 'pokeWindup') {
    spotTurkey(farmer);
    spawnPopup(run.popups, { text: 'SPOTTED!', x: turkey.x, y: GROUND_Y - 130, color: '#ff5a4e', size: 28 });
    run.events.push({ type: 'spotted' });
  } else {
    run.events.push({ type: 'unhide' });
  }
}

function handleHiding(run, controls, stage) {
  const turkey = run.turkey;
  if (turkey.hiddenIn) {
    if (controls.hidePressed || controls.jumpPressed) leaveHidingSpot(run, stage);
    return;
  }
  if (!controls.hidePressed || !turkey.onGround || turkey.knockedOut) return;
  const spot = hidingSpotUnderTurkey(run);
  if (spot) hideTurkey(run, spot);
  else run.events.push({ type: 'hideMissed' });
}

function pokeHidingSpot(run, spot) {
  shakeCamera(run.camera, 7);
  run.events.push({ type: 'poke' });
  const turkey = run.turkey;
  if (!spot || turkey.hiddenIn !== spot) return;
  spot.occupied = false;
  turkey.hiddenIn = null;
  turkey.vx = 160;
  turkey.vy = -480;
  turkey.onGround = false;
  run.stats.hits += 1;
  const knockedOut = hurtTurkey(turkey);
  spawnPopup(run.popups, { text: 'POKED! OUCH!', x: turkey.x, y: GROUND_Y - 150, color: '#ff5a4e', size: 26 });
  featherPuff(run, 18);
  run.events.push({ type: 'hurt', cause: 'pitchfork' });
  if (knockedOut) run.events.push({ type: 'knockedOut' });
}

// ---------------------------------------------------------------- contacts

function hasPassed(entity, body) {
  return entity.kind === 'knife' ? entity.x > body.x + body.w : entity.x + entity.w < body.x;
}

function collectPickup(run, entity) {
  const turkey = run.turkey;
  entity.gone = true;
  if (entity.kind === 'corn') {
    run.stats.corn += 1;
    turkey.meter = Math.min(T.meterMax, turkey.meter + T.cornMeter);
    addScore(run, S.corn, null);
    burst(run, { x: entity.x + 9, y: entity.y, count: 5, kind: 'spark', colors: SPARK_COLORS, speed: 120, life: 0.35, size: 4, gravity: 0 });
    run.events.push({ type: 'corn' });
  } else if (entity.kind === 'goldenCorn') {
    run.stats.corn += 5;
    turkey.meter = T.meterMax;
    addScore(run, S.goldenCorn, `GOLDEN COB! +${S.goldenCorn}`, entity.x + 13, entity.y - 34, '#ffd166', 22);
    burst(run, { x: entity.x + 13, y: entity.y, count: 16, kind: 'spark', colors: SPARK_COLORS, speed: 220, life: 0.6, size: 5, gravity: 0 });
    run.events.push({ type: 'golden' });
  } else if (entity.kind === 'featherPickup') {
    if (turkey.lives < T.maxLives) {
      turkey.lives += 1;
      spawnPopup(run.popups, { text: 'EXTRA TAIL FEATHER!', x: entity.x + 15, y: entity.y - 40, color: '#7bc950', size: 22 });
    } else {
      addScore(run, S.featherBonus, `FEATHER +${S.featherBonus}`, entity.x + 15, entity.y - 40, '#7bc950', 22);
    }
    burst(run, { x: entity.x + 15, y: entity.y, count: 14, kind: 'spark', colors: ['#c6f0a6', '#ffffff', '#7bc950'], speed: 200, life: 0.6, size: 5, gravity: 0 });
    run.events.push({ type: 'feather' });
  }
}

function slowInMud(run, entity) {
  const turkey = run.turkey;
  turkey.mudLeft = 0.15;
  if (entity.hit) return;
  entity.hit = true;
  burst(run, { x: turkey.x, y: GROUND_Y - 4, count: 12, kind: 'mud', colors: MUD_COLORS, speed: 260, spread: 1.6, life: 0.6, size: 6 });
  spawnPopup(run.popups, { text: 'SPLAT!', x: turkey.x, y: GROUND_Y - 84, color: '#d9b48a', size: 20 });
  run.events.push({ type: 'mud' });
}

function smashThrough(run, entity) {
  entity.gone = true;
  entity.smashed = true;
  run.stats.smashes += 1;
  const pumpkin = entity.kind === 'pumpkin';
  addScore(run, S.smash, `SMASH! +${S.smash}`, entity.x + entity.w / 2, GROUND_Y - entity.h - 34, '#ffb347', 22);
  burst(run, {
    x: entity.x + entity.w / 2,
    y: GROUND_Y - entity.h / 2,
    count: 18,
    kind: pumpkin ? 'chunk' : 'straw',
    colors: pumpkin ? PUMPKIN_COLORS : HAY_COLORS,
    speed: 340,
    life: 0.8,
    size: 7,
  });
  shakeCamera(run.camera, 4);
  run.events.push({ type: 'smash' });
}

function stumbleInto(run, entity) {
  const turkey = run.turkey;
  if (entity.hit) return;
  entity.hit = true;
  if (turkey.dashLeft > 0 && SMASHABLE.has(entity.kind)) {
    smashThrough(run, entity);
    return;
  }
  if (turkey.invulnerable > 0) return;
  stumbleTurkey(turkey, T.stumbleSeconds);
  shakeCamera(run.camera, 5);
  spawnPopup(run.popups, { text: 'OOF!', x: turkey.x, y: turkey.y - 92, color: '#fff6e5', size: 22 });
  featherPuff(run, 6);
  run.events.push({ type: 'stumble', kind: entity.kind });
}

function bumpChicken(run, chicken) {
  if (chicken.fled) return;
  chicken.fled = true;
  stumbleTurkey(run.turkey, T.bumpSeconds);
  spawnPopup(run.popups, { text: 'BAWK!', x: chicken.x + 18, y: GROUND_Y - 80, color: '#fff6e5', size: 20 });
  burst(run, { x: chicken.x + 18, y: GROUND_Y - 22, count: 10, kind: 'feather', colors: ['#ffffff', '#f1ece4', '#e8dfd2'], speed: 200, life: 1.1, size: 6, gravity: 220 });
  run.events.push({ type: 'bawk' });
}

function bonkHead(run, entity) {
  const turkey = run.turkey;
  if (entity.hit || turkey.invulnerable > 0) return;
  entity.hit = true;
  stumbleTurkey(turkey, T.bonkSeconds);
  turkey.forcedDuckLeft = T.bonkSeconds;
  shakeCamera(run.camera, 6);
  spawnPopup(run.popups, { text: 'BONK!', x: turkey.x, y: turkey.y - 96, color: '#ffe066', size: 24 });
  burst(run, { x: turkey.x + 10, y: turkey.y - 56, count: 7, kind: 'star', colors: ['#ffe066', '#fff6c9'], speed: 140, life: 0.7, size: 7, gravity: 0 });
  run.events.push({ type: 'bonk' });
}

function takeHit(run, entity) {
  const turkey = run.turkey;
  if (turkey.invulnerable > 0) return;
  entity.hit = true;
  if (entity.kind === 'knife') entity.gone = true;
  run.stats.hits += 1;
  const knockedOut = hurtTurkey(turkey);
  shakeCamera(run.camera, 11);
  spawnPopup(run.popups, { text: HURT_WORDS[entity.kind] ?? 'OUCH!', x: turkey.x, y: turkey.y - 104, color: '#ff6b5a', size: 26 });
  spawnPopup(run.popups, { text: '-1 FEATHER', x: turkey.x, y: turkey.y - 76, color: '#ffb3a6', size: 18 });
  featherPuff(run, 16);
  if (entity.kind === 'oven' || entity.kind === 'pot') {
    burst(run, { x: turkey.x, y: turkey.y - 30, count: 10, kind: 'smoke', colors: ['#8d8480', '#b9b0aa'], speed: 90, life: 1.0, size: 12, gravity: -120 });
  }
  run.events.push({ type: 'hurt', cause: entity.kind });
  if (knockedOut) {
    spawnPopup(run.popups, { text: 'OUT OF FEATHERS!', x: turkey.x, y: turkey.y - 140, color: '#ff6b5a', size: 24, life: 1.6 });
    run.events.push({ type: 'knockedOut' });
  }
}

function touchEntity(run, entity, effect) {
  switch (effect) {
    case 'collect':
      collectPickup(run, entity);
      break;
    case 'slow':
      slowInMud(run, entity);
      break;
    case 'stumble':
      stumbleInto(run, entity);
      break;
    case 'bump':
      bumpChicken(run, entity);
      break;
    case 'bonk':
      bonkHead(run, entity);
      break;
    case 'damage':
      takeHit(run, entity);
      break;
    default:
      break; // hiding spots wait for the hide key
  }
}

function resolveContacts(run) {
  const turkey = run.turkey;
  const body = turkeyBox(turkey);
  const nearBody = growBox(body, 20);
  for (const entity of run.course.entities) {
    if (entity.gone || entity.x > turkey.x + 280 || entity.x + entity.w < turkey.x - 280) continue;
    for (const box of hitboxesOf(entity)) {
      if (boxesOverlap(body, box)) touchEntity(run, entity, box.effect);
      else if (box.effect === 'damage' && boxesOverlap(nearBody, box)) entity.nearMiss = true;
      if (entity.gone) break;
    }
    if (entity.nearMiss && !entity.hit && !entity.scored && hasPassed(entity, body)) {
      entity.scored = true;
      run.stats.closeCalls += 1;
      if (entity.kind === 'oven') run.stats.ovenCloseCalls += 1;
      const chain = chainCloseCall(run.combo);
      addScore(run, chain.points, chain.label, turkey.x + 20, turkey.y - 96, '#ffe066', 20 + Math.min(chain.count - 1, 3) * 3);
      run.events.push({ type: 'closeCall', combo: chain.count });
    }
  }
}

// ---------------------------------------------------------------- the farmer's moves

const HARMLESS_KINDS = new Set(['corn', 'goldenCorn', 'featherPickup', 'haystack', 'barrel', 'pantry', 'gate', 'finishGate']);

// Fairness: a knife only flies when Tom will not be busy with another obstacle as it arrives.
function knifeLaneClear(run, gap) {
  const turkey = run.turkey;
  if (!turkey.onGround || turkey.hiddenIn) return false;
  const arrival = FARMER_TUNING.aimSeconds + gap / FARMER_TUNING.knifeSpeedBonus;
  const where = turkey.x + turkey.vx * arrival;
  for (const entity of run.course.entities) {
    if (entity.gone || HARMLESS_KINDS.has(entity.kind)) continue;
    if (entity.kind === 'knife') return false; // one knife in the air at a time
    if (entity.x < where + 170 && entity.x + entity.w > where - 170) return false;
  }
  return true;
}

function throwKnife(run, x, high) {
  const turkey = run.turkey;
  const course = run.course;
  course.entities.push({
    id: course.nextId++,
    kind: 'knife',
    x,
    y: high ? GROUND_Y - 38 : GROUND_Y - 4,
    w: 70,
    h: 12,
    vx: Math.max(turkey.vx, 200) + FARMER_TUNING.knifeSpeedBonus,
    high,
    spin: 0,
    hit: false,
    gone: false,
    used: false,
    occupied: false,
    nearMiss: false,
    scored: false,
    phase: null,
    timer: 0,
  });
  run.events.push({ type: 'knifeThrown', high });
  const hintKey = high ? 'knifeHigh' : 'knifeLow';
  if (!run.hintsShown.has(hintKey)) {
    run.hintsShown.add(hintKey);
    spawnPopup(run.popups, {
      text: high ? 'KNIFE! Hold DOWN to duck!' : 'LOW KNIFE! JUMP!',
      x: turkey.x + 60,
      y: GROUND_Y - 170,
      color: '#ffe066',
      size: 19,
      life: 2,
      hint: true,
    });
  }
}

// The farmer's ambush swipe connected: Tom wriggles free but leaves a tail feather in his fist.
function grabTurkey(run) {
  const turkey = run.turkey;
  run.stats.hits += 1;
  const knockedOut = hurtTurkey(turkey);
  shakeCamera(run.camera, 11);
  spawnPopup(run.popups, { text: 'GRABBED!', x: turkey.x, y: turkey.y - 104, color: '#ff6b5a', size: 26 });
  spawnPopup(run.popups, { text: '-1 FEATHER', x: turkey.x, y: turkey.y - 76, color: '#ffb3a6', size: 18 });
  featherPuff(run, 16);
  run.events.push({ type: 'hurt', cause: 'farmer' });
  if (knockedOut) {
    spawnPopup(run.popups, { text: 'OUT OF FEATHERS!', x: turkey.x, y: turkey.y - 140, color: '#ff6b5a', size: 24, life: 1.6 });
    run.events.push({ type: 'knockedOut' });
  }
}

function catchTurkey(run, reason) {
  if (run.outcome) return;
  const turkey = run.turkey;
  run.outcome = 'caught';
  run.outcomeReason = reason;
  run.endDelay = 2.4;
  turkey.caught = true;
  turkey.vx = 0;
  turkey.dashLeft = 0;
  if (turkey.hiddenIn) turkey.hiddenIn.occupied = false;
  turkey.hiddenIn = null;
  farmerCelebrates(run.farmer);
  shakeCamera(run.camera, 14);
  featherPuff(run, 26);
  spawnPopup(run.popups, { text: 'CAUGHT!', x: run.farmer.x + 40, y: GROUND_Y - 220, color: '#ff5a4e', size: 34, life: 2 });
  run.events.push({ type: 'caught', reason });
}

function escapeRun(run) {
  const turkey = run.turkey;
  run.outcome = 'escaped';
  run.endDelay = 2.8;
  turkey.escaped = true;
  const bonus = S.escape + turkey.lives * S.perFeatherLeft;
  addScore(run, bonus, `ESCAPED! +${bonus}`, turkey.x, GROUND_Y - 160, '#7bc950', 30);
  farmerGivesUp(run.farmer);
  burst(run, { x: turkey.x, y: GROUND_Y - 120, count: 40, kind: 'leaf', colors: LEAF_COLORS, speed: 360, life: 1.8, size: 8, gravity: 160 });
  run.events.push({ type: 'escaped' });
}

// ---------------------------------------------------------------- progress

function scoreDistance(run) {
  const turkey = run.turkey;
  if (turkey.x <= run.farthestX) return;
  run.score += ((turkey.x - run.farthestX) / PIXELS_PER_METER) * S.perMeter;
  run.farthestX = turkey.x;
}

function advanceStage(run) {
  const index = stageIndexAt(run.turkey.x);
  if (index <= run.stageIndex || run.outcome) return;
  const cleared = STAGES[run.stageIndex];
  addScore(run, S.stageClear * (run.stageIndex + 1), `${cleared.title.toUpperCase()} CLEARED!`, run.turkey.x + 40, GROUND_Y - 190, '#ffd166', 22);
  run.stageIndex = index;
  run.stageBannerLeft = 3.0;
  run.events.push({ type: 'stage', index });
}

function hintPosition(entity) {
  if (entity.kind === 'beam') return GROUND_Y - 210;
  if (entity.kind === 'lantern') return GROUND_Y - 340;
  if (entity.kind === 'table') return GROUND_Y - 170;
  return GROUND_Y - Math.min(Math.max(entity.h, 40), 180) - 54;
}

function showHints(run) {
  if (run.outcome) return;
  const turkey = run.turkey;
  for (const entity of run.course.entities) {
    const text = HINTS[entity.kind];
    if (!text || run.hintsShown.has(entity.kind)) continue;
    const ahead = entity.x - turkey.x;
    if (ahead > 560 || ahead < 140) continue;
    run.hintsShown.add(entity.kind);
    spawnPopup(run.popups, { text, x: entity.x + entity.w / 2, y: hintPosition(entity), color: '#fff6e5', size: 17, life: 2.6, hint: true });
  }
}

function trailEffects(run, dt) {
  const turkey = run.turkey;
  const random = run.effectsRandom;
  if (turkey.hiddenIn || turkey.caught) return;
  if ((turkey.dashLeft > 0 || turkey.sneakBoostLeft > 0) && random.next() < dt * 45) {
    burst(run, { x: turkey.x - 26, y: turkey.y - 24, count: 1, kind: 'dust', colors: ['#fff3dc', '#f3e3c3'], speed: 60, angle: Math.PI, spread: 0.6, life: 0.4, size: 10, gravity: -40 });
  }
  if (turkey.onGround && turkey.vx > 60 && random.next() < dt * 7) {
    burst(run, { x: turkey.x - 12, y: GROUND_Y - 3, count: 1, kind: 'dust', colors: ['#d8c3a0', '#c9b088'], speed: 40, angle: -2.6, spread: 0.5, life: 0.45, size: 7, gravity: -30 });
  }
}

export function updateRun(run, controls, dt) {
  run.events = [];
  run.time += dt;
  const stage = STAGES[run.stageIndex];
  const turkey = run.turkey;

  if (!run.outcome) handleHiding(run, controls, stage);
  updateTurkey(turkey, controls, stage, dt, run.events);
  for (const event of run.events) if (event.type === 'dash') run.stats.dashes += 1;
  updateAmbush(run, dt);
  updateFarmer(run.farmer, run, stage, dt);
  for (const entity of run.course.entities) updateEntity(entity, dt, run);
  if (!run.outcome && !turkey.hiddenIn) resolveContacts(run);

  scoreDistance(run);
  advanceStage(run);
  if (!run.outcome && turkey.x >= ROUTE_END_X) escapeRun(run);

  extendCourse(run.course, run.camera.x + VIEW_WIDTH + 900);
  pruneCourse(run.course, run.camera.x - 700);
  trailEffects(run, dt);
  coolCombo(run.combo, dt);
  updateEffects(run.particles, run.popups, dt);
  followTurkey(run.camera, turkey.x, dt, run.effectsRandom);
  run.stageBannerLeft = Math.max(0, run.stageBannerLeft - dt);
  showHints(run);

  if (run.outcome) {
    run.endDelay -= dt;
    if (run.endDelay <= 0) run.finished = true;
  }
}

export function rankTitle(summary) {
  if (summary.outcome === 'escaped') {
    if (summary.hits === 0) return 'Untouchable Tom';
    if (summary.livesLeft >= 2) return 'Barnyard Legend';
    return 'Free Bird';
  }
  if (summary.meters >= 1380) return 'So Close, Tom!';
  if (summary.meters >= 780) return 'Kitchen Fugitive';
  if (summary.meters >= 380) return 'Barn Runner';
  return 'Leftovers';
}

export function runSummary(run) {
  const summary = {
    outcome: run.outcome ?? 'caught',
    reason: run.outcomeReason,
    score: Math.floor(run.score),
    meters: Math.floor(Math.min(run.farthestX, ROUTE_END_X) / PIXELS_PER_METER),
    stageIndex: run.stageIndex,
    stageTitle: STAGES[run.stageIndex].title,
    livesLeft: run.turkey.lives,
    seconds: Math.floor(run.time),
    ...run.stats,
  };
  summary.rank = rankTitle(summary);
  return summary;
}
