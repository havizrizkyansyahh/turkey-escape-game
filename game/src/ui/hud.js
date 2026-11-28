// The heads-up display: score and distance, the route bar from the farmyard to the woods, Tom's
// tail feathers (lives), the gobble-dash meter, how close the farmer is, the stage banner, knife
// warnings at the screen edge, and the prompts for hiding and sneaking out.

import { GROUND_Y, VIEW_WIDTH, VIEW_HEIGHT, PIXELS_PER_METER, ROUTE_END_X, TURKEY_TUNING, DECOY_TUNING } from '../config.js';
import { STAGES, stageStartX } from '../stages.js';
import { PALETTE as P, INK } from '../art/palette.js';
import { panel, chunkyText, plainText, roundRectPath, fillAndOutline, ellipsePath, textWidth, BODY_FONT } from '../art/brush.js';
import { farmerGap } from '../run.js';
import { isHidingSpot } from '../course.js';

export function drawHud(ctx, run, game) {
  const time = run.time;
  drawScorePanel(ctx, run);
  drawFarmerChip(ctx, run, time);
  drawRouteBar(ctx, run);
  drawLivesAndMeter(ctx, run, time);
  if (!game?.shotMode) drawPauseButton(ctx);
  drawKnifeWarnings(ctx, run, time);
  drawFarmerOffscreen(ctx, run);
  drawHidePrompts(ctx, run, time);
  drawStageBanner(ctx, run);
  if (game?.showKeys !== false && !run.outcome) drawControlsStrip(ctx);
}

export const STAGE_COLORS = ['#8f9e3c', '#b5402f', '#3f7b77', '#6b4a8a'];

const STAGE_SHORT = ['FARMYARD', 'BARN', 'KITCHEN', 'PORCH'];

export const PAUSE_BUTTON = { id: 'pause', x: 906, y: 96, w: 40, h: 30 };

function formatNumber(value) {
  return Math.floor(value).toLocaleString('en-US');
}

function drawFeatherIcon(ctx, x, y, filled, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.scale(scale, scale);
  ellipsePath(ctx, 0, 0, 7, 16);
  ctx.fillStyle = filled ? P.tailDark : 'rgba(255, 246, 229, 0.15)';
  ctx.fill();
  if (filled) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = P.tailMid;
    ctx.fillRect(-8, -17, 16, 14);
    ctx.fillStyle = P.tailTip;
    ctx.fillRect(-8, -17, 16, 5);
    ctx.restore();
  }
  ellipsePath(ctx, 0, 0, 7, 16);
  ctx.lineWidth = 2;
  ctx.strokeStyle = filled ? INK : 'rgba(255, 246, 229, 0.5)';
  ctx.stroke();
  ctx.restore();
}

function drawScorePanel(ctx, run) {
  panel(ctx, 14, 12, 200, 76);
  const meters = Math.floor(run.turkey.x / PIXELS_PER_METER);
  plainText(ctx, 'SCORE', 30, 30, { size: 13, color: P.uiGold, weight: '800' });
  plainText(ctx, `DISTANCE ${meters} m`, 198, 30, { size: 12, align: 'right', color: P.uiGold, weight: '800' });
  chunkyText(ctx, formatNumber(run.score), 30, 57, { size: 30, align: 'left', outline: 5 });
  plainText(ctx, `STAGE ${run.stageIndex + 1}/${STAGES.length}  ·  ${STAGE_SHORT[run.stageIndex]}`, 30, 78, { size: 12, color: P.uiText, weight: '800' });
}

// What the farmer is up to right now, in words: chasing, searching, cornering, or fooled.
function farmerStatus(run) {
  const farmer = run.farmer;
  const gap = farmerGap(run);
  const meters = Math.max(0, Math.round(Math.abs(gap) / PIXELS_PER_METER));
  switch (farmer.state) {
    case 'shortcut':
      return { text: 'FARMER: SHORTCUT?!', color: P.uiGold, alarm: false };
    case 'cornering':
    case 'swipe':
      return { text: farmer.ambushHigh ? 'CORNERED! DUCK UNDER!' : 'CORNERED! JUMP OVER!', color: P.uiRed, alarm: true };
    case 'stunned':
      return { text: 'FARMER KNOCKED SILLY!', color: P.uiGreen, alarm: false };
    case 'tumble':
    case 'confused':
      return { text: 'FARMER FOOLED!', color: P.uiGreen, alarm: false };
    case 'distracted':
      return { text: 'FARMER DECOYED! RUN!', color: P.uiGreen, alarm: false };
    case 'approach':
    case 'search':
      return { text: 'FARMER SEARCHING...', color: P.uiGold, alarm: farmer.state === 'search' && farmer.lookingAtSpot };
    case 'pokeWindup':
    case 'poke':
      return { text: 'PITCHFORK POKE!', color: P.uiRed, alarm: true };
    case 'aim':
      return { text: `KNIFE INCOMING! · ${meters} m`, color: P.uiRed, alarm: true };
    case 'windup':
    case 'lunge':
      return { text: 'FARMER LUNGING!', color: P.uiRed, alarm: true };
    default:
      break;
  }
  if (run.turkey.hiddenIn) return { text: 'TOM IS HIDDEN', color: P.uiGreen, alarm: false };
  if (gap < 220) return { text: `FARMER CHASING · ${meters} m!`, color: P.uiRed, alarm: true };
  return { text: `FARMER CHASING · ${meters} m`, color: gap < 360 ? P.uiGold : P.uiGreen, alarm: false };
}

function drawFarmerChip(ctx, run, time) {
  const status = farmerStatus(run);
  const pulse = status.alarm ? 0.6 + 0.4 * Math.sin(time * 12) : 1;
  panel(ctx, 14, 94, 212, 32, { radius: 10, edge: status.color, edgeWidth: status.alarm ? 3 : 2 });
  ellipsePath(ctx, 32, 110, 7, 7);
  ctx.save();
  ctx.globalAlpha = pulse;
  fillAndOutline(ctx, status.color, 2);
  ctx.restore();
  plainText(ctx, status.text, 46, 111, { size: 13, color: status.alarm ? status.color : P.uiText, weight: '800' });
}

function routeX(worldX, left, width) {
  return left + (Math.min(Math.max(worldX, 0), ROUTE_END_X) / ROUTE_END_X) * width;
}

function drawRouteBar(ctx, run) {
  const left = 248;
  const width = 464;
  const top = 26;
  panel(ctx, left - 14, 12, width + 28, 52);
  for (let i = 0; i < STAGES.length; i += 1) {
    const x0 = routeX(stageStartX(i), left, width);
    const x1 = routeX(i + 1 < STAGES.length ? stageStartX(i + 1) : ROUTE_END_X, left, width);
    roundRectPath(ctx, x0 + 1, top, x1 - x0 - 2, 14, 4);
    ctx.fillStyle = STAGE_COLORS[i];
    ctx.globalAlpha = i <= run.stageIndex ? 1 : 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;
    plainText(ctx, STAGE_SHORT[i], (x0 + x1) / 2, top + 25, { size: 10, align: 'center', color: i === run.stageIndex ? P.uiGold : 'rgba(255, 246, 229, 0.7)', weight: '800' });
  }
  const endX = left + width;
  ctx.fillStyle = P.uiText;
  ctx.fillRect(endX + 2, top - 8, 2, 24);
  ctx.beginPath();
  ctx.moveTo(endX + 4, top - 8);
  ctx.lineTo(endX + 16, top - 3);
  ctx.lineTo(endX + 4, top + 2);
  ctx.closePath();
  ctx.fillStyle = P.uiGreen;
  ctx.fill();

  const farmerX = routeX(run.farmer.x, left, width);
  ellipsePath(ctx, farmerX, top + 7, 9, 4);
  fillAndOutline(ctx, P.hat, 2);
  roundRectPath(ctx, farmerX - 5, top - 2, 10, 8, 3);
  fillAndOutline(ctx, P.hat, 2);
  const turkeyX = routeX(run.turkey.x, left, width);
  ellipsePath(ctx, turkeyX, top + 7, 8, 8);
  fillAndOutline(ctx, P.turkeyFace, 2);
  ellipsePath(ctx, turkeyX + 3, top + 10, 2.5, 4);
  ctx.fillStyle = P.snood;
  ctx.fill();
}

function drawLivesAndMeter(ctx, run, time) {
  const turkey = run.turkey;
  panel(ctx, 746, 12, 200, 76);
  plainText(ctx, 'TAIL FEATHERS', 762, 30, { size: 12, color: P.uiGold, weight: '800' });
  for (let i = 0; i < TURKEY_TUNING.maxLives; i += 1) drawFeatherIcon(ctx, 880 + i * 22, 30, i < turkey.lives, 0.8);
  const meterLeft = 762;
  const meterWidth = 168;
  const fill = turkey.meter / TURKEY_TUNING.meterMax;
  const ready = turkey.meter >= TURKEY_TUNING.dashCost;
  plainText(ctx, ready ? 'GOBBLE-DASH READY  [SHIFT]' : 'GOBBLE-DASH  (eat corn)', meterLeft, 52, { size: 11, color: ready ? P.uiText : 'rgba(255, 246, 229, 0.6)', weight: '800' });
  roundRectPath(ctx, meterLeft, 62, meterWidth, 14, 7);
  ctx.fillStyle = 'rgba(255, 246, 229, 0.15)';
  ctx.fill();
  roundRectPath(ctx, meterLeft, 62, Math.max(14, meterWidth * fill), 14, 7);
  ctx.fillStyle = ready ? `rgba(255, 209, 102, ${0.8 + 0.2 * Math.sin(time * 8)})` : '#c98a3a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(43, 26, 18, 0.7)';
  ctx.lineWidth = 2;
  for (const mark of [1, 2]) {
    const markX = meterLeft + meterWidth * ((TURKEY_TUNING.dashCost * mark) / TURKEY_TUNING.meterMax);
    ctx.beginPath();
    ctx.moveTo(markX, 62);
    ctx.lineTo(markX, 76);
    ctx.stroke();
  }
  roundRectPath(ctx, meterLeft, 62, meterWidth, 14, 7);
  ctx.strokeStyle = 'rgba(255, 246, 229, 0.6)';
  ctx.stroke();
  drawDecoyChip(ctx, run);
}

// Corn decoys in hand: a cob icon each, and the key that tosses one.
function drawDecoyChip(ctx, run) {
  const has = run.decoys > 0;
  panel(ctx, 746, 94, 152, 32, { radius: 10, edge: has ? P.uiGold : 'rgba(255, 246, 229, 0.35)', edgeWidth: 2 });
  plainText(ctx, 'DECOY [Q]', 758, 111, { size: 12, color: has ? P.uiGold : 'rgba(255, 246, 229, 0.5)', weight: '800' });
  for (let i = 0; i < DECOY_TUNING.max; i += 1) {
    ellipsePath(ctx, 846 + i * 17, 110, 5, 9);
    fillAndOutline(ctx, i < run.decoys ? '#f6cd3f' : 'rgba(255, 246, 229, 0.15)', 2);
  }
}

function drawPauseButton(ctx) {
  const b = PAUSE_BUTTON;
  panel(ctx, b.x, b.y, b.w, b.h, { radius: 8 });
  ctx.fillStyle = P.uiText;
  ctx.fillRect(b.x + 14, b.y + 8, 4, 14);
  ctx.fillRect(b.x + 22, b.y + 8, 4, 14);
}

function drawStageBanner(ctx, run) {
  if (run.stageBannerLeft <= 0) return;
  const stage = STAGES[run.stageIndex];
  const fade = Math.min(1, run.stageBannerLeft / 0.5, (3.2 - run.stageBannerLeft) / 0.25 + 0.2);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, fade));
  panel(ctx, 220, 132, 520, 98, { radius: 18 });
  plainText(ctx, `STAGE ${run.stageIndex + 1} OF ${STAGES.length}`, 480, 154, { size: 13, align: 'center', color: P.uiGold, weight: '800' });
  chunkyText(ctx, stage.title.toUpperCase(), 480, 186, { size: 34, outline: 6 });
  plainText(ctx, stage.tagline, 480, 214, { size: 14, align: 'center', color: 'rgba(255, 246, 229, 0.9)' });
  ctx.restore();
}

function drawKnifeWarnings(ctx, run, time) {
  const cameraX = run.camera.x;
  const blink = Math.floor(time * 8) % 2 === 0;
  const warnings = [];
  for (const entity of run.course.entities) {
    if (entity.kind === 'knife' && !entity.gone && entity.x + entity.w < cameraX + 10) warnings.push(entity.high);
  }
  const farmerOffscreen = run.farmer.x - cameraX < -30;
  if (run.farmer.state === 'aim' && farmerOffscreen) warnings.push(run.farmer.aimHigh);
  for (const high of warnings) {
    const y = high ? GROUND_Y - 44 : GROUND_Y - 12;
    ctx.save();
    ctx.globalAlpha = blink ? 1 : 0.55;
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(34, y - 16);
    ctx.lineTo(34, y + 16);
    ctx.closePath();
    fillAndOutline(ctx, P.uiRed, 2.5);
    chunkyText(ctx, high ? 'KNIFE! DUCK' : 'KNIFE! JUMP', 44, y, { size: 15, align: 'left', fill: P.uiText, outline: 4 });
    ctx.restore();
  }
}

function drawFarmerOffscreen(ctx, run) {
  const screenX = run.farmer.x - run.camera.x;
  if (run.outcome) return;
  if (screenX > VIEW_WIDTH + 30 && (run.farmer.state === 'cornering' || run.farmer.state === 'swipe')) {
    panel(ctx, VIEW_WIDTH - 150, GROUND_Y - 150, 142, 34, { radius: 10, edge: P.uiRed, edgeWidth: 3 });
    plainText(ctx, 'FARMER AHEAD ▶', VIEW_WIDTH - 79, GROUND_Y - 133, { size: 13, align: 'center', color: P.uiText, weight: '800' });
    return;
  }
  if (screenX > -40) return;
  const meters = Math.round(farmerGap(run) / PIXELS_PER_METER);
  panel(ctx, 8, GROUND_Y - 150, 96, 34, { radius: 10, edge: 'rgba(255, 246, 229, 0.5)' });
  plainText(ctx, `◀ FARMER ${meters}m`, 18, GROUND_Y - 133, { size: 12, color: P.uiText, weight: '800' });
}

function nearbyHidingSpot(run) {
  const turkey = run.turkey;
  for (const entity of run.course.entities) {
    if (!isHidingSpot(entity) || entity.used) continue;
    if (turkey.x > entity.x - 170 && turkey.x < entity.x + entity.w + 12) return entity;
  }
  return null;
}

function drawHidePrompts(ctx, run, time) {
  const turkey = run.turkey;
  if (run.outcome) return;
  const cameraX = run.camera.x;
  if (turkey.hiddenIn) {
    const spot = turkey.hiddenIn;
    const farmer = run.farmer;
    let text = 'HIDING... the farmer is coming';
    let color = P.uiText;
    if (farmer.state === 'search' && farmer.lookingAtSpot) {
      text = "HE'S LOOKING — STAY STILL!";
      color = P.uiRed;
    } else if (farmer.state === 'search') {
      text = 'NOW! PRESS E TO SNEAK OUT';
      color = P.uiGreen;
    } else if (farmer.state === 'pokeWindup') {
      text = 'UH OH... THE PITCHFORK!';
      color = P.uiRed;
    } else if (farmer.state !== 'approach') {
      text = 'Press E to come out';
    }
    // a banner on the floor strip, clear of the farmer and his speech
    const pulse = color === P.uiGreen ? 1 + Math.sin(time * 12) * 0.05 : 1;
    ctx.save();
    ctx.translate(VIEW_WIDTH / 2, GROUND_Y + 56);
    ctx.scale(pulse, pulse);
    panel(ctx, -200, -24, 400, 48, { radius: 16, edge: color, edgeWidth: 3, fill: 'rgba(43, 26, 18, 0.9)' });
    chunkyText(ctx, text, 0, 1, { size: 20, fill: color, outline: 4, shadow: false });
    ctx.restore();
    return;
  }
  const spot = nearbyHidingSpot(run);
  if (!spot) return;
  const x = spot.x + spot.w / 2 - cameraX;
  const bob = Math.sin(time * 6) * 4;
  panel(ctx, x - 62, GROUND_Y - spot.h - 58 + bob, 124, 34, { radius: 12, edge: P.uiGold, edgeWidth: 3 });
  chunkyText(ctx, '[E] HIDE!', x, GROUND_Y - spot.h - 41 + bob, { size: 17, fill: P.uiGold, outline: 4, shadow: false });
}

// The keys along the bottom of the screen, as key caps. H hides or shows the strip.
function drawControlsStrip(ctx) {
  const y = VIEW_HEIGHT - 17;
  const gap = 14;
  const items = CONTROL_KEYS.map(([key, label]) => {
    const capWidth = Math.max(24, textWidth(ctx, key, 12, BODY_FONT, '800') + 14);
    return { key, label, capWidth, width: capWidth + 6 + textWidth(ctx, label, 12, BODY_FONT, '800') };
  });
  const total = items.reduce((sum, item) => sum + item.width, 0) + gap * (items.length - 1);
  let x = (VIEW_WIDTH - total) / 2;
  panel(ctx, x - 14, y - 15, total + 28, 30, { radius: 12, edgeWidth: 1.5, fill: 'rgba(43, 26, 18, 0.82)' });
  for (const item of items) {
    roundRectPath(ctx, x, y - 10, item.capWidth, 20, 5);
    fillAndOutline(ctx, '#fff3dc', 2);
    plainText(ctx, item.key, x + item.capWidth / 2, y + 1, { size: 12, align: 'center', color: INK, weight: '800' });
    plainText(ctx, item.label, x + item.capWidth + 6, y + 1, { size: 12, color: P.uiText, weight: '800' });
    x += item.width + gap;
  }
}

const CONTROL_KEYS = [
  ['SPACE', 'JUMP · FLUTTER'],
  ['S', 'DUCK'],
  ['SHIFT', 'GOBBLE-DASH'],
  ['E', 'HIDE'],
  ['Q', 'DECOY'],
  ['← →', 'PACE'],
  ['P', 'PAUSE'],
  ['H', 'KEYS'],
];
