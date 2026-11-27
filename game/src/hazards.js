// What every course object does: its hit boxes and their effect on Tom, and how the moving and
// cycling ones behave (the oven's blast, the pot's boil-over, rolling pins, thrown knives).

import { GROUND_Y } from './config.js';
import { hitbox } from './collisions.js';

const NONE = [];

export const HIDING_SPOTS = new Set(['haystack', 'barrel', 'pantry']);
export const SMASHABLE = new Set(['haybale', 'pumpkin']);

export const OVEN_TIMING = { warn: 0.9, blast: 1.0, flameInset: 24 };
export const POT_TIMING = { rattle: 0.7, geyser: 0.85 };

export function lanternPosition(lantern) {
  const angle = Math.sin(lantern.swing * 2.1 + lantern.phaseOffset) * 0.85;
  const pivotX = lantern.x + lantern.w / 2;
  const pivotY = GROUND_Y - 300;
  return { x: pivotX + Math.sin(angle) * lantern.rope, y: pivotY + Math.cos(angle) * lantern.rope, angle, pivotX, pivotY };
}

function floorBox(effect, entity, inset) {
  return hitbox(effect, entity.x + inset, GROUND_Y - entity.h + inset, entity.w - inset * 2, entity.h - inset);
}

export function hitboxesOf(entity) {
  if (entity.gone) return NONE;
  switch (entity.kind) {
    case 'haybale':
    case 'baleStack':
    case 'pumpkin':
    case 'fence':
    case 'rockingChair':
      return [floorBox('stumble', entity, 6)];
    case 'chicken':
      return entity.fled ? NONE : [floorBox('bump', entity, 4)];
    case 'mud':
      return [hitbox('slow', entity.x + 14, GROUND_Y - 6, entity.w - 28, 6)];
    case 'corn':
    case 'goldenCorn':
    case 'featherPickup':
      return [hitbox('collect', entity.x, entity.y - entity.h / 2, entity.w, entity.h)];
    case 'haystack':
    case 'barrel':
    case 'pantry':
      return [floorBox('hide', entity, 10)];
    case 'beam':
      // the beam hangs from the rafters: only a ducking turkey fits under it
      return [hitbox('bonk', entity.x + 4, GROUND_Y - entity.clearance - 400, entity.w - 8, 400)];
    case 'table':
      // duck under the tablecloth, or flutter over the whole table
      return [hitbox('bonk', entity.x + 4, GROUND_Y - entity.clearance - 48, entity.w - 8, 48)];
    case 'lantern': {
      const at = lanternPosition(entity);
      return [hitbox('bonk', at.x - 14, at.y - 18, 28, 34)];
    }
    case 'pitchforks':
      return [floorBox('damage', entity, 8)];
    case 'oven':
      return entity.phase === 'blast'
        ? [hitbox('damage', entity.x + OVEN_TIMING.flameInset, GROUND_Y - entity.flameHeight, entity.w - OVEN_TIMING.flameInset * 2, entity.flameHeight)]
        : NONE;
    case 'pot': {
      const boxes = [floorBox('stumble', entity, 6)];
      if (entity.phase === 'geyser') boxes.push(hitbox('damage', entity.x + 8, GROUND_Y - entity.h - 190, entity.w - 16, 190));
      return boxes;
    }
    case 'rollingPin':
      return [floorBox('damage', entity, 4)];
    case 'knife':
      return [hitbox('damage', entity.x + 6, entity.y - entity.h, entity.w - 12, entity.h)];
    default:
      return NONE;
  }
}

function isNearTurkey(entity, run) {
  return Math.abs(entity.x - run.turkey.x) < 900;
}

function cycleOven(oven, dt, run) {
  oven.timer -= dt;
  if (oven.timer > 0) return;
  if (oven.phase === 'idle') {
    oven.phase = 'warn';
    oven.timer = OVEN_TIMING.warn;
    if (isNearTurkey(oven, run)) run.events.push({ type: 'ovenWarn' });
  } else if (oven.phase === 'warn') {
    oven.phase = 'blast';
    oven.timer = OVEN_TIMING.blast;
    if (isNearTurkey(oven, run)) run.events.push({ type: 'ovenBlast' });
  } else {
    oven.phase = 'idle';
    oven.timer = oven.idleSeconds;
  }
}

function cyclePot(pot, dt, run) {
  pot.timer -= dt;
  if (pot.timer > 0) return;
  if (pot.phase === 'simmer') {
    pot.phase = 'rattle';
    pot.timer = POT_TIMING.rattle;
  } else if (pot.phase === 'rattle') {
    pot.phase = 'geyser';
    pot.timer = POT_TIMING.geyser;
    if (isNearTurkey(pot, run)) run.events.push({ type: 'geyser' });
  } else {
    pot.phase = 'simmer';
    pot.timer = pot.idleSeconds;
  }
}

function rollPin(pin, dt, run) {
  if (!pin.rolling && run.turkey.x > pin.x - 850) pin.rolling = true;
  if (!pin.rolling) return;
  pin.x -= pin.speed * dt;
  pin.angle -= (pin.speed * dt) / 12;
  if (pin.x < run.camera.x - 300) pin.gone = true;
}

function flyKnife(knife, dt, run) {
  knife.x += knife.vx * dt;
  knife.spin += dt;
  if (knife.x > run.turkey.x + 1300) knife.gone = true;
}

function wanderChicken(chicken, dt) {
  chicken.wander += dt;
  if (chicken.fled) {
    chicken.x += 260 * dt;
    chicken.y -= 210 * dt;
    chicken.fleeTime = (chicken.fleeTime ?? 0) + dt;
    if (chicken.fleeTime > 2) chicken.gone = true;
    return;
  }
  chicken.x += Math.sin(chicken.wander * 0.9) * 28 * dt;
}

export function updateEntity(entity, dt, run) {
  switch (entity.kind) {
    case 'oven':
      cycleOven(entity, dt, run);
      break;
    case 'pot':
      cyclePot(entity, dt, run);
      break;
    case 'rollingPin':
      rollPin(entity, dt, run);
      break;
    case 'knife':
      flyKnife(entity, dt, run);
      break;
    case 'chicken':
      wanderChicken(entity, dt);
      break;
    case 'lantern':
      entity.swing += dt;
      break;
    case 'rockingChair':
      entity.rock += dt;
      break;
    default:
      break;
  }
}
