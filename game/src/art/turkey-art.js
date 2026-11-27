// Tom Wattle, drawn with canvas paths: a banded fan tail, a round brown body with breast scallops,
// a pale blue face with a red snood and wattle, and orange legs. turkeyLook() turns the
// simulation's state into a pose; drawTurkey() paints any pose at any size.

import { PALETTE as P, INK } from './palette.js';
import { ellipsePath, fillAndOutline, limb } from './brush.js';

const TAIL_ANGLES = [0.96, 1.07, 1.18, 1.29, 1.4, 1.51, 1.62]; // × π: from behind him to straight up
const TAIL_SPREAD = { run: 0.85, jump: 1, flutter: 1.15, dash: 0.7, duck: 0.62, stumble: 0.95, hurt: 1.15, dazed: 0.7, proud: 1.25, scared: 1.2, idle: 0.95 };

export function turkeyLook(turkey, time) {
  let pose = 'run';
  if (turkey.caught) pose = 'scared';
  else if (turkey.knockedOut && turkey.onGround) pose = 'dazed';
  else if (turkey.escaped && turkey.vx < 60) pose = 'proud';
  else if (!turkey.onGround) pose = turkey.flutterLeft > 0 ? 'flutter' : 'jump';
  else if (turkey.invulnerable > 1.0) pose = 'hurt';
  else if (turkey.stumbleLeft > 0) pose = 'stumble';
  else if (turkey.ducking) pose = 'duck';
  else if (turkey.dashLeft > 0 || turkey.sneakBoostLeft > 0) pose = 'dash';
  return {
    pose,
    phase: turkey.runPhase,
    flap: turkey.flapPhase,
    squash: turkey.squash,
    blink: time % 3.4 < 0.12,
    flash: turkey.invulnerable > 0 && !turkey.knockedOut && Math.floor(time * 16) % 2 === 0,
    scale: 1.15,
  };
}

function layoutFor(pose) {
  if (pose === 'duck') return { bodyY: -22, bodyRx: 30, bodyRy: 18, headX: 36, headY: -24, tailY: -28, tailLength: 0.72, hipY: -9 };
  if (pose === 'dazed') return { bodyY: -21, bodyRx: 30, bodyRy: 19, headX: 33, headY: -13, tailY: -24, tailLength: 0.62, hipY: -9 };
  if (pose === 'proud') return { bodyY: -42, bodyRx: 28, bodyRy: 24, headX: 21, headY: -72, tailY: -50, tailLength: 1.12, hipY: -22 };
  return { bodyY: -40, bodyRx: 28, bodyRy: 23, headX: 24, headY: -66, tailY: -46, tailLength: 1, hipY: -22 };
}

function drawTailFan(ctx, layout, spread) {
  const centerAngle = 1.29 * Math.PI;
  for (let i = 0; i < TAIL_ANGLES.length; i += 1) {
    const angle = centerAngle + (TAIL_ANGLES[i] * Math.PI - centerAngle) * spread;
    const length = (47 - Math.abs(i - 3) * 2.6) * layout.tailLength;
    const width = 10.5;
    ctx.save();
    ctx.translate(-16, layout.tailY);
    ctx.rotate(angle);
    ellipsePath(ctx, length * 0.5, 0, length * 0.52, width);
    ctx.fillStyle = P.tailDark;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = P.tailMid;
    ctx.fillRect(length * 0.46, -width, length * 0.34, width * 2);
    ctx.fillStyle = P.tailBand;
    ctx.fillRect(length * 0.8, -width, length * 0.07, width * 2);
    ctx.fillStyle = P.tailTip;
    ctx.fillRect(length * 0.87, -width, length * 0.2, width * 2);
    ctx.strokeStyle = 'rgba(43, 26, 18, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(length * 0.86, 0);
    ctx.stroke();
    ctx.restore();
    ellipsePath(ctx, length * 0.5, 0, length * 0.52, width);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
  }
}

function drawLeg(ctx, layout, look, back) {
  const { pose, phase = 0 } = look;
  let swing;
  let lift;
  if (pose === 'jump' || pose === 'flutter') {
    swing = back ? -0.55 : 0.35;
    lift = 9;
  } else if (pose === 'duck' || pose === 'dazed') {
    swing = back ? -0.45 : 0.55;
    lift = 0;
  } else if (pose === 'proud' || pose === 'scared' || pose === 'idle') {
    swing = back ? -0.16 : 0.16;
    lift = 0;
  } else {
    const legPhase = phase + (back ? Math.PI : 0);
    swing = Math.sin(legPhase) * (pose === 'dash' ? 1.05 : 0.8);
    lift = Math.max(0, -Math.cos(legPhase)) * 9;
  }
  const hipX = back ? -7 : 4;
  const hipY = layout.hipY;
  const footX = hipX + Math.sin(swing) * 18;
  const footY = -lift;
  const kneeX = (hipX + footX) / 2 + 5;
  const kneeY = (hipY + footY) / 2 - 1;
  const color = back ? P.legsBack : P.legs;
  limb(ctx, [[hipX, hipY], [kneeX, kneeY], [footX, footY]], 4.5, color, 2);
  for (const toe of [-0.55, 0, 0.55]) {
    limb(ctx, [[footX, footY], [footX + Math.cos(toe) * 8, footY + Math.sin(toe) * 3]], 3, color, 1.5);
  }
}

function drawBody(ctx, layout) {
  const gradient = ctx.createRadialGradient(-7, layout.bodyY - 12, 3, 0, layout.bodyY, layout.bodyRx + 10);
  gradient.addColorStop(0, P.turkeyLight);
  gradient.addColorStop(0.6, P.turkeyBody);
  gradient.addColorStop(1, P.turkeyShade);
  ellipsePath(ctx, 0, layout.bodyY, layout.bodyRx, layout.bodyRy);
  fillAndOutline(ctx, gradient, 3);
  const squash = layout.bodyRy / 23;
  ctx.strokeStyle = 'rgba(43, 26, 18, 0.42)';
  ctx.lineWidth = 1.6;
  for (const [dx, dy] of [[13, -9], [19, -1], [11, 3], [20, 8], [6, 11], [14, 13]]) {
    ctx.beginPath();
    ctx.arc(dx, layout.bodyY + dy * squash, 5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
}

function drawWing(ctx, layout, look) {
  const { pose, flap = 0 } = look;
  let open = 0;
  if (pose === 'flutter') open = Math.sin(flap) * 0.95 - 0.35;
  else if (pose === 'jump') open = -0.5;
  else if (pose === 'scared') open = -0.9 + Math.sin(flap * 1.5) * 0.45;
  else if (pose === 'proud') open = -0.25;
  else if (pose === 'hurt' || pose === 'stumble') open = -0.7;
  ctx.save();
  ctx.translate(-1, layout.bodyY - 4);
  ctx.rotate(-0.18 + open);
  ellipsePath(ctx, -8, 3, 19, 11.5, 0.15);
  fillAndOutline(ctx, P.turkeyShade, 2.5);
  ctx.fillStyle = P.tailTip;
  for (let i = 0; i < 3; i += 1) {
    ellipsePath(ctx, -21 + i * 6.5, 9 - i * 1.2, 5, 2.2, 0.3);
    ctx.fill();
  }
  ctx.restore();
}

function drawEye(ctx, x, y, look) {
  const { pose } = look;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  if (pose === 'hurt' || pose === 'dazed') {
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x - 3.5, y - 3.5);
    ctx.lineTo(x + 3.5, y + 3.5);
    ctx.moveTo(x + 3.5, y - 3.5);
    ctx.lineTo(x - 3.5, y + 3.5);
    ctx.stroke();
    return;
  }
  if (look.blink && pose !== 'scared') {
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x + 4, y);
    ctx.stroke();
    return;
  }
  const big = pose === 'scared' ? 1.25 : 1;
  ellipsePath(ctx, x, y, 4.6 * big, 5.2 * big);
  fillAndOutline(ctx, '#ffffff', 1.8);
  ellipsePath(ctx, x + (pose === 'scared' ? 0 : 1.6), y + 0.3, pose === 'scared' ? 1.5 : 2.4, pose === 'scared' ? 1.5 : 2.6);
  ctx.fillStyle = INK;
  ctx.fill();
  ellipsePath(ctx, x + 2.2, y - 1.4, 0.9, 0.9);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

function drawHead(ctx, layout, look) {
  const { pose } = look;
  const hx = layout.headX;
  const hy = layout.headY;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(12, layout.bodyY - 10);
  ctx.quadraticCurveTo(hx - 10, hy + 15, hx, hy);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 14;
  ctx.stroke();
  ctx.strokeStyle = P.turkeyFaceShade;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.restore();

  ellipsePath(ctx, hx + 1, hy + 11.5, 4.6, 6.6);
  fillAndOutline(ctx, P.snood, 2);
  ellipsePath(ctx, hx, hy, 11.5, 11);
  fillAndOutline(ctx, P.turkeyFace, 2.5);

  const gape = pose === 'scared' || pose === 'hurt' || pose === 'dash' || pose === 'flutter' ? 3.5 : 0;
  ctx.beginPath();
  ctx.moveTo(hx + 8, hy - 3);
  ctx.lineTo(hx + 19, hy + 0.5);
  ctx.lineTo(hx + 8, hy + 2);
  ctx.closePath();
  fillAndOutline(ctx, P.beak, 2);
  if (gape) {
    ctx.beginPath();
    ctx.moveTo(hx + 8, hy + 3);
    ctx.lineTo(hx + 16, hy + 3.5 + gape);
    ctx.lineTo(hx + 8, hy + 6.5);
    ctx.closePath();
    fillAndOutline(ctx, P.beak, 2);
  }
  ctx.beginPath();
  ctx.moveTo(hx + 5, hy - 9);
  ctx.bezierCurveTo(hx + 13, hy - 9.5, hx + 16, hy + 1, hx + 13.5, hy + 11);
  ctx.bezierCurveTo(hx + 9.5, hy + 8, hx + 9, hy - 1, hx + 3, hy - 5);
  ctx.closePath();
  fillAndOutline(ctx, P.snood, 2);

  drawEye(ctx, hx + 1, hy - 3, look);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (pose === 'proud') {
    ctx.moveTo(hx - 4, hy - 10);
    ctx.lineTo(hx + 5, hy - 9);
  } else {
    ctx.moveTo(hx - 4, hy - 8.5);
    ctx.lineTo(hx + 6, hy - 11.5);
  }
  ctx.stroke();
}

function drawDazedStars(ctx, layout, time) {
  ctx.fillStyle = '#ffe066';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i += 1) {
    const angle = time * 4 + (i * Math.PI * 2) / 3;
    const x = layout.headX + Math.cos(angle) * 16;
    const y = layout.headY - 16 + Math.sin(angle) * 5;
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

export function drawTurkey(ctx, x, y, look, time = 0) {
  const { pose, scale = 1 } = look;
  const layout = layoutFor(pose);
  ctx.save();
  ctx.translate(x, y);
  if (look.flash) ctx.globalAlpha *= 0.45;
  ctx.scale(scale, scale);
  if (look.squash > 0) ctx.scale(1 + look.squash * 0.7, 1 - look.squash * 0.7);
  let lean = 0;
  if (pose === 'dash') lean = -0.2;
  else if (pose === 'run') lean = -0.05;
  else if (pose === 'stumble') lean = 0.22 + Math.sin((look.phase ?? 0) * 3) * 0.08;
  else if (pose === 'hurt') lean = 0.18;
  const bob = pose === 'run' || pose === 'dash' ? -Math.abs(Math.sin(look.phase ?? 0)) * 4 : 0;
  ctx.translate(0, bob);
  ctx.rotate(lean);
  drawTailFan(ctx, layout, TAIL_SPREAD[pose] ?? 0.9);
  drawLeg(ctx, layout, look, true);
  drawBody(ctx, layout);
  drawLeg(ctx, layout, look, false);
  drawWing(ctx, layout, look);
  drawHead(ctx, layout, look);
  if (pose === 'dazed') drawDazedStars(ctx, layout, time);
  ctx.restore();
}

// Two wide eyes peeking out of a hiding spot.
export function drawPeekingEyes(ctx, x, y, lookLeft, time) {
  const blink = time % 2.7 < 0.12;
  for (const dx of [-7, 7]) {
    ellipsePath(ctx, x + dx, y, 6, blink ? 1.2 : 7);
    fillAndOutline(ctx, '#ffffff', 2);
    if (!blink) {
      ellipsePath(ctx, x + dx + (lookLeft ? -2.5 : 2.5), y + 1, 2.6, 3);
      ctx.fillStyle = INK;
      ctx.fill();
    }
  }
}
