// The camera keeps Tom in the left part of the screen so the road ahead shows, eases after him
// when he dashes, and shakes on hits.

import { TURKEY_TUNING } from './config.js';

export function createCamera(x) {
  return { x, shake: 0, offsetX: 0, offsetY: 0 };
}

export function followTurkey(camera, turkeyX, dt, random) {
  const target = turkeyX - TURKEY_TUNING.screenX;
  camera.x += (target - camera.x) * Math.min(1, dt * 7);
  if (camera.shake > 0.05) {
    camera.shake = Math.max(0, camera.shake - dt * 28);
    camera.offsetX = (random.next() * 2 - 1) * camera.shake;
    camera.offsetY = (random.next() * 2 - 1) * camera.shake * 0.6;
  } else {
    camera.shake = 0;
    camera.offsetX = 0;
    camera.offsetY = 0;
  }
}

export function shakeCamera(camera, amount) {
  camera.shake = Math.max(camera.shake, amount);
}
