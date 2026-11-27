// Tom Wattle, the turkey: running, a jump with a second-press flutter, ducking, the gobble-dash,
// and what stumbles and hits do to him. Hiding is decided in run.js, which knows the farmer.

import { GRAVITY, GROUND_Y, TURKEY_TUNING as T } from './config.js';
import { approach } from './numbers.js';

export function createTurkey(x) {
  return {
    x,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    onGround: true,
    ducking: false,
    flutterLeft: 0,
    flutterUsed: false,
    jumpCut: false,
    airTime: 0,
    dashLeft: 0,
    meter: T.meterStart,
    lives: T.maxLives,
    invulnerable: 0,
    stumbleLeft: 0,
    forcedDuckLeft: 0,
    mudLeft: 0,
    sneakBoostLeft: 0,
    hiddenIn: null,
    knockedOut: false,
    caught: false,
    escaped: false,
    runPhase: 0,
    flapPhase: 0,
    squash: 0,
  };
}

export function turkeyBox(turkey) {
  const height = turkey.ducking ? T.duckHeight : T.height;
  return { x: turkey.x - T.width / 2, y: turkey.y - height, w: T.width, h: height };
}

export function isTurkeyFree(turkey) {
  return !turkey.caught && !turkey.knockedOut && !turkey.escaped;
}

export function turkeyTargetSpeed(turkey, controls, stage) {
  if (turkey.caught || turkey.knockedOut) return 0;
  if (turkey.escaped) return stage.runSpeed * 0.7;
  let speed = stage.runSpeed;
  if (controls.right) speed += T.speedUpBonus;
  if (controls.left) speed -= T.slowDownPenalty;
  if (turkey.dashLeft > 0) speed += T.dashBonus;
  if (turkey.sneakBoostLeft > 0) speed += T.sneakBoostBonus;
  if (turkey.mudLeft > 0 && turkey.onGround && turkey.dashLeft <= 0) speed *= T.mudSpeedFactor;
  if (turkey.stumbleLeft > 0) speed *= T.stumbleSpeedFactor;
  return speed;
}

function jumpOrFlutter(turkey, events) {
  if (turkey.onGround) {
    turkey.vy = -T.jumpSpeed;
    turkey.onGround = false;
    turkey.flutterUsed = false;
    turkey.jumpCut = false;
    turkey.airTime = 0;
    turkey.ducking = false;
    events.push({ type: 'jump' });
  } else if (!turkey.flutterUsed) {
    turkey.flutterUsed = true;
    turkey.flutterLeft = T.flutterSeconds;
    turkey.vy = Math.min(turkey.vy, -T.flutterLift);
    events.push({ type: 'flutter' });
  }
}

function applyGravity(turkey, controls, free, dt, events) {
  if (turkey.onGround) return;
  let gravity = GRAVITY;
  if (turkey.flutterLeft > 0) gravity *= T.flutterGravity;
  else if (free && controls.duck) gravity *= T.fastFallGravity;
  turkey.vy += gravity * dt;
  turkey.y += turkey.vy * dt;
  if (turkey.y >= GROUND_Y) {
    turkey.y = GROUND_Y;
    turkey.vy = 0;
    turkey.onGround = true;
    turkey.squash = 0.16;
    events.push({ type: 'land' });
  }
}

function countDownTimers(turkey, dt) {
  turkey.meter = Math.min(T.meterMax, turkey.meter + T.meterPerSecond * dt);
  turkey.flutterLeft = Math.max(0, turkey.flutterLeft - dt);
  turkey.dashLeft = Math.max(0, turkey.dashLeft - dt);
  turkey.invulnerable = Math.max(0, turkey.invulnerable - dt);
  turkey.stumbleLeft = Math.max(0, turkey.stumbleLeft - dt);
  turkey.forcedDuckLeft = Math.max(0, turkey.forcedDuckLeft - dt);
  turkey.mudLeft = Math.max(0, turkey.mudLeft - dt);
  turkey.sneakBoostLeft = Math.max(0, turkey.sneakBoostLeft - dt);
  turkey.squash = Math.max(0, turkey.squash - dt);
}

export function updateTurkey(turkey, controls, stage, dt, events) {
  if (turkey.hiddenIn) {
    turkey.vx = 0;
    turkey.ducking = false;
    turkey.runPhase += dt * 2;
    countDownTimers(turkey, dt);
    return;
  }
  const free = isTurkeyFree(turkey);
  const boosted = turkey.dashLeft > 0 || turkey.sneakBoostLeft > 0;
  turkey.vx = approach(turkey.vx, turkeyTargetSpeed(turkey, controls, stage), T.acceleration * (boosted ? 3 : 1) * dt);

  if (free && controls.jumpPressed && turkey.stumbleLeft <= 0) jumpOrFlutter(turkey, events);
  // Letting go early makes a lower hop, but even a tap gets a tenth of a second of full lift.
  const holding = controls.jump || controls.jumpPressed;
  if (!holding && turkey.vy < 0 && !turkey.jumpCut && turkey.flutterLeft <= 0 && turkey.airTime >= T.minJumpSeconds) {
    turkey.vy *= T.jumpCut;
    turkey.jumpCut = true;
  }
  if (!turkey.onGround) turkey.airTime += dt;
  applyGravity(turkey, controls, free, dt, events);
  turkey.ducking = free && turkey.onGround && (controls.duck || turkey.forcedDuckLeft > 0);

  if (free && controls.dashPressed && turkey.dashLeft <= 0) {
    if (turkey.meter >= T.dashCost) {
      turkey.dashLeft = T.dashSeconds;
      turkey.meter -= T.dashCost;
      turkey.stumbleLeft = 0;
      events.push({ type: 'dash' });
    } else {
      events.push({ type: 'dashEmpty' });
    }
  }

  countDownTimers(turkey, dt);
  turkey.x += turkey.vx * dt;
  turkey.runPhase += dt * (4 + turkey.vx / 30);
  turkey.flapPhase += dt * (turkey.flutterLeft > 0 ? 34 : 8);
}

export function stumbleTurkey(turkey, seconds) {
  turkey.stumbleLeft = Math.max(turkey.stumbleLeft, seconds);
}

// Costs a tail feather (a life). Returns true when that was the last one.
export function hurtTurkey(turkey) {
  turkey.lives -= 1;
  turkey.invulnerable = T.hurtInvulnerable;
  stumbleTurkey(turkey, 0.45);
  if (turkey.lives <= 0) {
    turkey.lives = 0;
    turkey.knockedOut = true;
    turkey.dashLeft = 0;
    turkey.sneakBoostLeft = 0;
  }
  return turkey.knockedOut;
}
