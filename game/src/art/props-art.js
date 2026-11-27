// Painters for every course object, in three layers: "back" (hiding spots, the oven's body, stage
// doors), "floor" (what Tom jumps or bumps) and "front" (beams, flames, geysers and flying knives
// that pass in front of him). Each painter draws one entity at its screen position.

import { GROUND_Y, ROUTE_END_X } from '../config.js';
import { stageStartX } from '../stages.js';
import { lanternPosition, OVEN_TIMING, POT_TIMING } from '../hazards.js';
import { hashNoise } from '../random.js';
import { PALETTE as P, INK } from './palette.js';
import { ellipsePath, roundRectPath, fillAndOutline, limb, groundShadow, chunkyText, star } from './brush.js';
import { drawPeekingEyes } from './turkey-art.js';

const PORCH_X = stageStartX(3);

// ---------------------------------------------------------------- farmyard

function paintBale(ctx, x, y, w, h, tilt) {
  ctx.save();
  ctx.translate(x + w / 2, y + h);
  ctx.rotate(tilt);
  ctx.translate(-w / 2, -h);
  roundRectPath(ctx, 0, 0, w, h, 9);
  ctx.fillStyle = P.hay;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = P.hayLight;
  ctx.fillRect(0, 0, w, h * 0.24);
  ctx.fillStyle = P.hayDark;
  ctx.fillRect(0, h * 0.8, w, h * 0.2);
  ctx.strokeStyle = 'rgba(150, 100, 28, 0.65)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 10; i += 1) {
    const lx = 4 + (i * (w - 8)) / 9;
    ctx.beginPath();
    ctx.moveTo(lx, 3);
    ctx.quadraticCurveTo(lx + 3, h / 2, lx - 2, h - 3);
    ctx.stroke();
  }
  ctx.fillStyle = '#8f5f25';
  ctx.fillRect(w * 0.25, 0, 5, h);
  ctx.fillRect(w * 0.68, 0, 5, h);
  ctx.restore();
  roundRectPath(ctx, 0, 0, w, h, 9);
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.strokeStyle = P.hayDark;
  ctx.lineWidth = 2;
  for (const [sx, sy, ex, ey] of [[10, 1, 4, -7], [w * 0.5, 0, w * 0.5 + 6, -8], [w - 12, 1, w - 5, -6]]) {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

function paintHaybale(ctx, e, sx) {
  groundShadow(ctx, sx + e.w / 2, GROUND_Y, e.w * 0.58);
  paintBale(ctx, sx, GROUND_Y - e.h, e.w, e.h, e.hit ? 0.28 : 0);
}

function paintBaleStack(ctx, e, sx) {
  groundShadow(ctx, sx + e.w / 2, GROUND_Y, e.w * 0.6);
  paintBale(ctx, sx, GROUND_Y - 52, e.w, 52, 0);
  paintBale(ctx, sx + 4, GROUND_Y - 104, e.w - 8, 52, e.hit ? -0.18 : 0.03);
}

function paintFence(ctx, e, sx) {
  const top = GROUND_Y - e.h;
  groundShadow(ctx, sx + e.w / 2, GROUND_Y, e.w * 0.62);
  if (e.sign) {
    limb(ctx, [[sx + e.w / 2, top + 4], [sx + e.w / 2, top - 22]], 5, P.woodDark, 2);
    roundRectPath(ctx, sx - 6, top - 46, e.w + 12, 24, 4);
    fillAndOutline(ctx, P.trim, 2.5);
    chunkyText(ctx, 'KITCHEN →', sx + e.w / 2, top - 34, { size: 11, fill: P.barnRed, outline: 0, shadow: false });
  }
  for (const px of [sx + 5, sx + e.w - 17]) {
    ctx.beginPath();
    ctx.moveTo(px, GROUND_Y);
    ctx.lineTo(px, top + 6);
    ctx.lineTo(px + 6, top);
    ctx.lineTo(px + 12, top + 6);
    ctx.lineTo(px + 12, GROUND_Y);
    ctx.closePath();
    fillAndOutline(ctx, P.wood, 3);
  }
  [top + 12, top + 34].forEach((railY, index) => {
    ctx.save();
    if (e.hit && index === 0) {
      ctx.translate(sx + 8, railY + 5);
      ctx.rotate(0.45);
      ctx.translate(-(sx + 8), -(railY + 5));
    }
    roundRectPath(ctx, sx - 5, railY, e.w + 10, 11, 3);
    fillAndOutline(ctx, P.woodLight, 3);
    ctx.strokeStyle = 'rgba(94, 58, 32, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx + 3, railY + 5);
    ctx.lineTo(sx + e.w - 5, railY + 6);
    ctx.stroke();
    ctx.restore();
  });
}

function paintMud(ctx, e, sx, time) {
  const cx = sx + e.w / 2;
  ellipsePath(ctx, cx, GROUND_Y + 2, e.w / 2, 10);
  fillAndOutline(ctx, '#5f3c20', 2.5);
  ellipsePath(ctx, cx - 8, GROUND_Y, e.w / 2 - 20, 5);
  ctx.fillStyle = '#7a4e2b';
  ctx.fill();
  ellipsePath(ctx, cx - 34, GROUND_Y - 1, 16, 2.2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fill();
  for (let i = 0; i < 3; i += 1) {
    const t = (time * 0.8 + i * 0.37 + e.id * 0.13) % 1;
    ctx.beginPath();
    ctx.arc(sx + 34 + i * 46, GROUND_Y - t * 3, 2 + t * 3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(60, 35, 18, ${1 - t})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function paintPumpkin(ctx, e, sx, time) {
  const cx = sx + e.w / 2;
  const cy = GROUND_Y - e.h / 2;
  const jackOLantern = e.x >= PORCH_X;
  groundShadow(ctx, cx, GROUND_Y, e.w * 0.56);
  if (jackOLantern) {
    const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 60);
    glow.addColorStop(0, 'rgba(255, 190, 80, 0.45)');
    glow.addColorStop(1, 'rgba(255, 190, 80, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 60, cy - 60, 120, 120);
  }
  const base = [P.pumpkin, '#ec8b3a', '#d9662a'][e.look ?? 0];
  const shade = ctx.createRadialGradient(cx - 8, cy - 8, 3, cx, cy, e.w * 0.62);
  shade.addColorStop(0, P.pumpkinLight);
  shade.addColorStop(0.55, base);
  shade.addColorStop(1, P.pumpkinDark);
  for (const [dx, rx] of [[-e.w * 0.2, e.w * 0.3], [e.w * 0.2, e.w * 0.3], [0, e.w * 0.31]]) {
    ellipsePath(ctx, cx + dx, cy, rx, e.h / 2);
    fillAndOutline(ctx, shade, 2.5);
  }
  const stemTop = cy - e.h / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 3, stemTop + 3);
  ctx.quadraticCurveTo(cx - 2, stemTop - 9, cx + 5, stemTop - 11);
  ctx.lineTo(cx + 6, stemTop - 6);
  ctx.quadraticCurveTo(cx + 2, stemTop - 3, cx + 3, stemTop + 3);
  ctx.closePath();
  fillAndOutline(ctx, '#6b5a2a', 2);
  ellipsePath(ctx, cx + 12, stemTop - 2, 8, 4, -0.4);
  fillAndOutline(ctx, P.leaf, 2);
  if (jackOLantern) {
    const flicker = 0.75 + 0.25 * Math.sin(time * 13 + e.id);
    ctx.fillStyle = `rgba(255, 214, 102, ${flicker})`;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    for (const ex of [-9, 9]) {
      ctx.beginPath();
      ctx.moveTo(cx + ex - 5, cy - 3);
      ctx.lineTo(cx + ex, cy - 10);
      ctx.lineTo(cx + ex + 5, cy - 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - 13, cy + 4);
    ctx.quadraticCurveTo(cx, cy + 16, cx + 13, cy + 4);
    ctx.lineTo(cx + 6, cy + 7);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx - 6, cy + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function paintChicken(ctx, e, sx, time) {
  const bob = e.fled ? 0 : Math.abs(Math.sin(time * 6 + e.wander)) * 2;
  const x = sx + e.w / 2;
  const y = (e.fled ? e.y : GROUND_Y) - bob;
  if (!e.fled) groundShadow(ctx, x, GROUND_Y, 16);
  ctx.save();
  ctx.translate(x, y);
  const facing = e.fled ? 1 : Math.cos(e.wander * 0.9) > 0 ? 1 : -1;
  ctx.scale(facing, 1);
  if (!e.fled) {
    limb(ctx, [[-3, -10], [-4, 0]], 2.4, P.legs, 1.2);
    limb(ctx, [[4, -10], [5, 0]], 2.4, P.legs, 1.2);
  }
  ctx.beginPath();
  ctx.moveTo(-10, -20);
  ctx.lineTo(-20, -30);
  ctx.lineTo(-17, -16);
  ctx.closePath();
  fillAndOutline(ctx, '#f1ece4', 2);
  ellipsePath(ctx, 0, -18, 14, 11);
  fillAndOutline(ctx, '#fbf7f0', 2.5);
  const flap = e.fled ? Math.sin(time * 40) * 0.9 : 0;
  ctx.save();
  ctx.translate(-2, -19);
  ctx.rotate(flap);
  ellipsePath(ctx, -3, 2, 8.5, 5);
  fillAndOutline(ctx, '#e9e0d2', 2);
  ctx.restore();
  ellipsePath(ctx, 11, -29, 6.5, 6.5);
  fillAndOutline(ctx, '#fbf7f0', 2.2);
  ctx.fillStyle = P.snood;
  for (const [cx, cy] of [[8, -36], [11.5, -37.5], [15, -36]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(16, -30);
  ctx.lineTo(22, -28);
  ctx.lineTo(16, -26);
  ctx.closePath();
  fillAndOutline(ctx, P.beak, 1.5);
  ellipsePath(ctx, 16, -23.5, 2, 3);
  ctx.fillStyle = P.snood;
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(12.5, -30.5, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- pickups

function paintCorn(ctx, e, sx, time) {
  const bob = Math.sin(time * 4 + e.id * 0.7) * 2.5;
  const cx = sx + e.w / 2;
  const cy = e.y + bob;
  ctx.fillStyle = P.leaf;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + 12);
    ctx.quadraticCurveTo(cx + side * 11, cy + 4, cx + side * 7, cy - 8);
    ctx.quadraticCurveTo(cx + side * 3, cy + 2, cx, cy + 12);
    ctx.fill();
  }
  ellipsePath(ctx, cx, cy - 1, 6, 11.5);
  fillAndOutline(ctx, '#f6cd3f', 2);
  ctx.fillStyle = '#e2a51b';
  for (let row = -8; row <= 6; row += 3.5) {
    ctx.fillRect(cx - 3, cy + row, 1.8, 1.8);
    ctx.fillRect(cx + 0.8, cy + row, 1.8, 1.8);
  }
  ellipsePath(ctx, cx - 2.4, cy - 5, 1.3, 3.4);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fill();
}

function glowHalo(ctx, x, y, radius, color) {
  const glow = ctx.createRadialGradient(x, y, 2, x, y, radius);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function paintGoldenCorn(ctx, e, sx, time) {
  const bob = Math.sin(time * 3 + e.id) * 3;
  const cx = sx + e.w / 2;
  const cy = e.y + bob;
  glowHalo(ctx, cx, cy, 34, 'rgba(255, 220, 110, 0.6)');
  ellipsePath(ctx, cx, cy, 8.5, 15);
  const gold = ctx.createLinearGradient(cx - 8, 0, cx + 8, 0);
  gold.addColorStop(0, '#fff1a8');
  gold.addColorStop(0.5, '#ffcf3a');
  gold.addColorStop(1, '#d99a12');
  fillAndOutline(ctx, gold, 2.5);
  ctx.save();
  ctx.translate(cx + 9, cy - 13);
  ctx.rotate(time * 2);
  star(ctx, 0, 0, 6, 2.4, 4, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
}

function paintFeatherPickup(ctx, e, sx, time) {
  const bob = Math.sin(time * 2.6 + e.id) * 4;
  const cx = sx + e.w / 2;
  const cy = e.y + bob;
  glowHalo(ctx, cx, cy, 40, 'rgba(200, 255, 170, 0.55)');
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.5 + Math.sin(time * 2) * 0.1);
  ellipsePath(ctx, 0, 0, 8, 19);
  ctx.fillStyle = P.tailDark;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = P.tailMid;
  ctx.fillRect(-9, -20, 18, 16);
  ctx.fillStyle = P.tailTip;
  ctx.fillRect(-9, -20, 18, 6);
  ctx.restore();
  ellipsePath(ctx, 0, 0, 8, 19);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  limb(ctx, [[0, 18], [0, 25]], 2, P.tailTip, 1);
  ctx.restore();
  chunkyText(ctx, '+1', cx + 16, cy - 18, { size: 13, fill: '#c6f0a6', outline: 3, shadow: false });
}

// ---------------------------------------------------------------- hiding spots

function haystackPath(ctx, e, sx, rustle) {
  const cx = sx + e.w / 2;
  const top = GROUND_Y - e.h;
  ctx.beginPath();
  ctx.moveTo(sx - 6, GROUND_Y);
  ctx.bezierCurveTo(sx - 2, top + 34, cx - 46 + rustle, top - 2, cx + rustle * 0.5, top);
  ctx.bezierCurveTo(cx + 46 - rustle, top - 2, sx + e.w + 2, top + 34, sx + e.w + 6, GROUND_Y);
  ctx.closePath();
}

function paintHaystack(ctx, e, sx, time) {
  const cx = sx + e.w / 2;
  const top = GROUND_Y - e.h;
  const rustle = e.occupied ? Math.sin(time * 26) * 1.6 : 0;
  groundShadow(ctx, cx, GROUND_Y, e.w * 0.62);
  const hay = ctx.createLinearGradient(0, top, 0, GROUND_Y);
  hay.addColorStop(0, P.hayLight);
  hay.addColorStop(0.55, P.hay);
  hay.addColorStop(1, P.hayDark);
  haystackPath(ctx, e, sx, rustle);
  ctx.fillStyle = hay;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(150, 100, 25, 0.55)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 30; i += 1) {
    const hx = sx + hashNoise(e.id * 31 + i) * e.w;
    const hy = top + 8 + hashNoise(e.id * 17 + i * 3) * (e.h - 8);
    const angle = -1.3 + hashNoise(i * 7 + e.id) * 0.9;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(angle) * 13, hy + Math.sin(angle) * 13);
    ctx.stroke();
  }
  ctx.restore();
  haystackPath(ctx, e, sx, rustle);
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.strokeStyle = P.hayDark;
  ctx.lineWidth = 2;
  for (const dx of [-10, 0, 12]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx, top + 3);
    ctx.lineTo(cx + dx * 1.6, top - 9);
    ctx.stroke();
  }
  if (e.occupied) {
    for (const [dx, angle] of [[-8, -2.2], [2, -1.6], [12, -1.0]]) {
      ctx.save();
      ctx.translate(cx + dx, top + 8);
      ctx.rotate(angle);
      ellipsePath(ctx, 9, 0, 10, 4.5);
      fillAndOutline(ctx, P.tailMid, 1.8);
      ctx.restore();
    }
    drawPeekingEyes(ctx, cx - 4, top + 56, true, time);
  }
}

function paintBarrel(ctx, e, sx, time) {
  const top = GROUND_Y - e.h;
  const cx = sx + e.w / 2;
  groundShadow(ctx, cx, GROUND_Y, e.w * 0.6);
  ctx.beginPath();
  ctx.moveTo(sx + 7, top + 6);
  ctx.quadraticCurveTo(sx - 5, top + e.h / 2, sx + 7, GROUND_Y);
  ctx.lineTo(sx + e.w - 7, GROUND_Y);
  ctx.quadraticCurveTo(sx + e.w + 5, top + e.h / 2, sx + e.w - 7, top + 6);
  ctx.closePath();
  const wood = ctx.createLinearGradient(sx, 0, sx + e.w, 0);
  wood.addColorStop(0, P.woodDark);
  wood.addColorStop(0.4, P.woodLight);
  wood.addColorStop(1, P.woodDark);
  fillAndOutline(ctx, wood, 3);
  ctx.strokeStyle = 'rgba(60, 35, 18, 0.5)';
  ctx.lineWidth = 1.6;
  for (const f of [0.25, 0.5, 0.75]) {
    ctx.beginPath();
    ctx.moveTo(sx + e.w * f, top + 8);
    ctx.quadraticCurveTo(sx + e.w * f + (f - 0.5) * 16, top + e.h / 2, sx + e.w * f, GROUND_Y - 2);
    ctx.stroke();
  }
  for (const f of [0.18, 0.8]) {
    roundRectPath(ctx, sx + 1, top + e.h * f, e.w - 2, 8, 3);
    fillAndOutline(ctx, '#4a4440', 2);
  }
  const lift = e.occupied ? 13 + Math.sin(time * 3) * 2 : 0;
  if (e.occupied) drawPeekingEyes(ctx, cx, top + 4, true, time);
  ellipsePath(ctx, cx, top + 6 - lift, e.w / 2 - 6, 7, e.occupied ? -0.12 : 0);
  fillAndOutline(ctx, P.woodLight, 3);
}

function paintPantry(ctx, e, sx, time) {
  const top = GROUND_Y - e.h;
  groundShadow(ctx, sx + e.w / 2, GROUND_Y, e.w * 0.6);
  roundRectPath(ctx, sx, top, e.w, e.h, 6);
  fillAndOutline(ctx, P.cabinet, 3);
  roundRectPath(ctx, sx - 7, top - 9, e.w + 14, 13, 3);
  fillAndOutline(ctx, P.cabinetDark, 3);
  const doorW = (e.w - 18) / 2;
  roundRectPath(ctx, sx + 6, top + 10, doorW, e.h - 20, 4);
  fillAndOutline(ctx, '#4b8a86', 2.5);
  roundRectPath(ctx, sx + 14, top + 22, doorW - 16, e.h - 46, 3);
  ctx.strokeStyle = 'rgba(43, 26, 18, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();
  const rightX = sx + 12 + doorW;
  if (e.occupied) {
    roundRectPath(ctx, rightX, top + 10, doorW, e.h - 20, 4);
    fillAndOutline(ctx, '#2a1a12', 2.5);
    for (let shelf = 1; shelf <= 3; shelf += 1) {
      const shelfY = top + 10 + ((e.h - 20) * shelf) / 4;
      ctx.fillStyle = P.woodLight;
      ctx.fillRect(rightX + 2, shelfY, doorW - 4, 4);
      ctx.fillStyle = shelf === 2 ? '#c44a2c' : '#e0b24a';
      ctx.fillRect(rightX + 6, shelfY - 14, 9, 14);
      ctx.fillRect(rightX + 22, shelfY - 11, 8, 11);
    }
    drawPeekingEyes(ctx, rightX + doorW / 2 + 2, top + 78, true, time);
    ctx.save();
    ctx.translate(rightX + doorW, top + 10);
    ctx.transform(0.45, -0.08, 0, 1, 0, 0);
    roundRectPath(ctx, 0, 0, doorW, e.h - 20, 4);
    fillAndOutline(ctx, '#4b8a86', 2.5);
    ctx.restore();
  } else {
    roundRectPath(ctx, rightX, top + 10, doorW, e.h - 20, 4);
    fillAndOutline(ctx, '#4b8a86', 2.5);
    roundRectPath(ctx, rightX + 8, top + 22, doorW - 16, e.h - 46, 3);
    ctx.stroke();
  }
  for (const kx of [sx + 6 + doorW - 8, rightX + 8]) {
    ellipsePath(ctx, kx, top + e.h / 2, 3.5, 3.5);
    fillAndOutline(ctx, P.gold, 1.5);
  }
  roundRectPath(ctx, sx + e.w / 2 - 30, top - 30, 60, 18, 4);
  fillAndOutline(ctx, P.trim, 2);
  chunkyText(ctx, 'PANTRY', sx + e.w / 2, top - 21, { size: 10, fill: P.cabinetDark, outline: 0, shadow: false });
}

// ---------------------------------------------------------------- barn

function paintBeam(ctx, e, sx) {
  const bottom = GROUND_Y - e.clearance;
  const top = bottom - e.h;
  ctx.save();
  ctx.strokeStyle = '#4e4036';
  ctx.lineWidth = 4;
  ctx.setLineDash([8, 4]);
  for (const cx of [sx + 18, sx + e.w - 18]) {
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, top + 4);
    ctx.stroke();
  }
  ctx.restore();
  roundRectPath(ctx, sx - 6, top, e.w + 12, e.h, 5);
  const wood = ctx.createLinearGradient(0, top, 0, bottom);
  wood.addColorStop(0, P.woodLight);
  wood.addColorStop(1, P.woodDark);
  fillAndOutline(ctx, wood, 3);
  ctx.strokeStyle = 'rgba(43, 26, 18, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sx, top + 10);
  ctx.bezierCurveTo(sx + 40, top + 6, sx + 80, top + 16, sx + e.w, top + 11);
  ctx.moveTo(sx + 8, top + 20);
  ctx.bezierCurveTo(sx + 50, top + 24, sx + 90, top + 18, sx + e.w - 6, top + 22);
  ctx.stroke();
  for (const bx of [sx + 18, sx + e.w - 18]) {
    ellipsePath(ctx, bx, top + e.h / 2, 4, 4);
    fillAndOutline(ctx, '#7c7068', 1.5);
  }
}

function paintLantern(ctx, e, sx, time) {
  const at = lanternPosition(e);
  const shift = sx - e.x;
  const px = at.pivotX + shift;
  const lx = at.x + shift;
  const ly = at.y;
  roundRectPath(ctx, px - 30, at.pivotY - 12, 60, 14, 3);
  fillAndOutline(ctx, P.woodDark, 2.5);
  ctx.strokeStyle = '#6b5a4a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(px, at.pivotY);
  ctx.lineTo(lx, ly - 22);
  ctx.stroke();
  glowHalo(ctx, lx, ly, 70, 'rgba(255, 196, 90, 0.42)');
  ctx.save();
  ctx.translate(lx, ly);
  ctx.rotate(-at.angle);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -22, 7, Math.PI, 0);
  ctx.stroke();
  roundRectPath(ctx, -12, -20, 24, 7, 2);
  fillAndOutline(ctx, '#4a4440', 2);
  roundRectPath(ctx, -10, -13, 20, 24, 4);
  const flame = 0.8 + 0.2 * Math.sin(time * 17 + e.id);
  fillAndOutline(ctx, `rgba(255, 205, 96, ${flame})`, 2);
  ellipsePath(ctx, 0, 1, 3.5, 6);
  ctx.fillStyle = '#fff6c9';
  ctx.fill();
  ctx.strokeStyle = '#4a4440';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, -13);
  ctx.lineTo(-4, 11);
  ctx.moveTo(4, -13);
  ctx.lineTo(4, 11);
  ctx.stroke();
  roundRectPath(ctx, -12, 10, 24, 7, 2);
  fillAndOutline(ctx, '#4a4440', 2);
  ctx.restore();
}

function paintPitchforks(ctx, e, sx) {
  const cx = sx + e.w / 2;
  groundShadow(ctx, cx, GROUND_Y, e.w * 0.6);
  for (const [baseX, lean] of [[sx + 14, -0.25], [sx + e.w - 18, 0.22], [cx, 0]]) {
    ctx.save();
    ctx.translate(baseX, GROUND_Y - 8);
    ctx.rotate(lean);
    limb(ctx, [[0, 0], [0, -12]], 5, P.woodLight, 2);
    limb(ctx, [[-9, -12], [9, -12]], 3.5, P.steelDark, 1.5);
    for (const tx of [-8, 0, 8]) {
      ctx.beginPath();
      ctx.moveTo(tx - 2, -12);
      ctx.lineTo(tx, -32);
      ctx.lineTo(tx + 2, -12);
      ctx.closePath();
      fillAndOutline(ctx, P.steel, 1.5);
    }
    ctx.restore();
  }
  ellipsePath(ctx, cx, GROUND_Y - 4, e.w / 2 + 6, 10);
  fillAndOutline(ctx, P.hay, 2.5);
  ctx.strokeStyle = P.hayDark;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath();
    ctx.moveTo(sx + 4 + i * 10, GROUND_Y - 2);
    ctx.lineTo(sx + 9 + i * 10, GROUND_Y - 11);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- kitchen

function paintOvenBody(ctx, e, sx, time) {
  const x = sx;
  const w = e.w;
  const top = GROUND_Y - e.h;
  const shake = e.phase === 'warn' ? Math.sin(time * 70) * 1.8 : 0;
  ctx.save();
  ctx.translate(shake, 0);
  groundShadow(ctx, x + w / 2, GROUND_Y, w * 0.6, 0.3);
  for (const fx of [x + 10, x + w - 24]) {
    roundRectPath(ctx, fx, GROUND_Y - 12, 14, 12, 3);
    fillAndOutline(ctx, P.ovenIron, 2.5);
  }
  roundRectPath(ctx, x + 10, top - 34, w - 20, 36, [9, 9, 0, 0]);
  fillAndOutline(ctx, P.ovenIronLight, 3);
  ellipsePath(ctx, x + w / 2, top - 16, 11, 11);
  fillAndOutline(ctx, P.cream, 2.5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, top - 16);
  ctx.lineTo(x + w / 2, top - 24);
  ctx.moveTo(x + w / 2, top - 16);
  ctx.lineTo(x + w / 2 + 6, top - 14);
  ctx.stroke();
  for (const dx of [-42, 42]) {
    ellipsePath(ctx, x + w / 2 + dx, top - 16, 6, 6);
    fillAndOutline(ctx, P.ovenChrome, 2);
  }
  const body = ctx.createLinearGradient(x, 0, x + w, 0);
  body.addColorStop(0, P.ovenIronLight);
  body.addColorStop(0.5, P.ovenIron);
  body.addColorStop(1, '#201c1a');
  roundRectPath(ctx, x, top, w, e.h - 10, 10);
  fillAndOutline(ctx, body, 3);
  roundRectPath(ctx, x - 6, top - 4, w + 12, 12, 4);
  fillAndOutline(ctx, P.ovenIronLight, 3);
  roundRectPath(ctx, x + w / 2 - 34, top + 14, 68, 16, 4);
  fillAndOutline(ctx, '#b88a3a', 2);
  chunkyText(ctx, 'OLD BERTHA', x + w / 2, top + 22, { size: 9, fill: '#3a2418', outline: 0, shadow: false });

  const doorX = x + 14;
  const doorY = top + 40;
  const doorW = w - 28;
  const doorH = e.h - 68;
  if (e.phase === 'blast') {
    const cavity = ctx.createRadialGradient(doorX + doorW / 2, doorY + doorH * 0.6, 4, doorX + doorW / 2, doorY + doorH * 0.6, doorW * 0.7);
    cavity.addColorStop(0, P.fireCore);
    cavity.addColorStop(0.45, P.fireMid);
    cavity.addColorStop(1, '#7a2410');
    roundRectPath(ctx, doorX, doorY, doorW, doorH, 6);
    fillAndOutline(ctx, cavity, 3);
    ctx.beginPath();
    ctx.moveTo(doorX - 4, doorY + doorH);
    ctx.lineTo(doorX + doorW + 4, doorY + doorH);
    ctx.lineTo(doorX + doorW + 14, doorY + doorH + 13);
    ctx.lineTo(doorX - 14, doorY + doorH + 13);
    ctx.closePath();
    fillAndOutline(ctx, P.ovenIronLight, 3);
  } else {
    roundRectPath(ctx, doorX, doorY, doorW, doorH, 6);
    fillAndOutline(ctx, P.ovenIronLight, 3);
    const heat = e.phase === 'warn' ? 0.65 + 0.35 * Math.sin(time * 30) : 0.32;
    const windowGlow = ctx.createLinearGradient(0, doorY + 14, 0, doorY + doorH - 16);
    windowGlow.addColorStop(0, `rgba(255, 140, 40, ${heat})`);
    windowGlow.addColorStop(1, `rgba(255, 220, 120, ${heat})`);
    roundRectPath(ctx, doorX + 14, doorY + 16, doorW - 28, doorH - 36, 5);
    fillAndOutline(ctx, '#1d1210', 2.5);
    roundRectPath(ctx, doorX + 14, doorY + 16, doorW - 28, doorH - 36, 5);
    ctx.fillStyle = windowGlow;
    ctx.fill();
    roundRectPath(ctx, doorX + 10, doorY + 5, doorW - 20, 7, 3);
    fillAndOutline(ctx, P.ovenChrome, 2);
    if (e.phase === 'warn') {
      chunkyText(ctx, '!', x + w / 2, top - 58, { size: 30, fill: P.uiRed, outline: 5 });
      ctx.strokeStyle = 'rgba(255, 170, 80, 0.7)';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i += 1) {
        const wx = x + 40 + i * 35;
        const rise = (time * 60 + i * 12) % 26;
        ctx.beginPath();
        ctx.moveTo(wx, top - 40 - rise);
        ctx.quadraticCurveTo(wx + 6, top - 48 - rise, wx, top - 56 - rise);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function flamePath(ctx, left, right, baseY, heights, valley) {
  const count = heights.length;
  const segment = (right - left) / count;
  ctx.beginPath();
  ctx.moveTo(left, baseY);
  for (let i = 0; i < count; i += 1) {
    const x0 = left + segment * i;
    const h = heights[i];
    const endY = i === count - 1 ? baseY : baseY - h * valley;
    ctx.quadraticCurveTo(x0 + segment * 0.05, baseY - h * 0.75, x0 + segment * 0.5, baseY - h);
    ctx.quadraticCurveTo(x0 + segment * 0.95, baseY - h * 0.6, x0 + segment, endY);
  }
  ctx.closePath();
}

function paintOvenFlames(ctx, e, sx, time) {
  if (e.phase !== 'blast' && e.phase !== 'warn') return;
  const cx = sx + e.w / 2;
  if (e.phase === 'warn') {
    glowHalo(ctx, cx, GROUND_Y - 10, 90, 'rgba(255, 140, 50, 0.3)');
    return;
  }
  const progress = 1 - e.timer / OVEN_TIMING.blast;
  const swell = Math.min(1, progress * 6) * (progress > 0.85 ? (1 - progress) / 0.15 : 1);
  glowHalo(ctx, cx, GROUND_Y - 30, 170, 'rgba(255, 150, 50, 0.5)');
  // low licks rolling out across the floor on both sides of the door
  for (const side of [-1, 1]) {
    const baseX = side < 0 ? sx + 2 : sx + e.w - 2;
    const lick = 18 + Math.sin(time * 16 + side) * 5;
    ctx.beginPath();
    ctx.moveTo(baseX - 26, GROUND_Y);
    ctx.quadraticCurveTo(baseX - 10 * side, GROUND_Y - lick, baseX + 4 * side, GROUND_Y - lick * 1.5 * swell);
    ctx.quadraticCurveTo(baseX + 12 * side, GROUND_Y - lick * 0.6, baseX + 26, GROUND_Y);
    ctx.closePath();
    ctx.fillStyle = P.fireMid;
    ctx.fill();
  }
  const left = sx + OVEN_TIMING.flameInset - 10;
  const right = sx + e.w - OVEN_TIMING.flameInset + 10;
  const layers = [
    { color: P.fireOuter, scale: 1.0, outline: true },
    { color: P.fireMid, scale: 0.74, outline: false },
    { color: P.fireCore, scale: 0.44, outline: false },
  ];
  for (const layer of layers) {
    const heights = [];
    for (let i = 0; i < 6; i += 1) {
      heights.push((e.flameHeight + 16) * layer.scale * swell * (0.72 + 0.28 * Math.sin(time * 19 + i * 1.7 + e.id + layer.scale * 3)));
    }
    flamePath(ctx, left + (1 - layer.scale) * 18, right - (1 - layer.scale) * 18, GROUND_Y, heights, 0.38);
    ctx.fillStyle = layer.color;
    ctx.fill();
    if (layer.outline) {
      ctx.strokeStyle = '#8a2a0c';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#ffe9a0';
  for (let i = 0; i < 6; i += 1) {
    const rise = (time * 120 + i * 37 + e.id * 11) % 120;
    ctx.beginPath();
    ctx.arc(left + ((i * 23 + e.id * 7) % (right - left)), GROUND_Y - e.flameHeight - rise * 0.6, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintPot(ctx, e, sx, time) {
  const cx = sx + e.w / 2;
  const top = GROUND_Y - e.h;
  const jiggle = e.phase === 'rattle' ? Math.sin(time * 50) * 2.2 : 0;
  groundShadow(ctx, cx, GROUND_Y, e.w * 0.62);
  ctx.fillStyle = '#4a6fd8';
  for (let i = 0; i < 5; i += 1) {
    const fx = sx + 10 + i * 11;
    const fh = 6 + Math.sin(time * 20 + i) * 2;
    ctx.beginPath();
    ctx.moveTo(fx - 4, GROUND_Y);
    ctx.quadraticCurveTo(fx, GROUND_Y - fh * 2, fx + 4, GROUND_Y);
    ctx.fill();
  }
  const metal = ctx.createLinearGradient(sx, 0, sx + e.w, 0);
  metal.addColorStop(0, '#eef2f5');
  metal.addColorStop(0.45, P.steel);
  metal.addColorStop(1, P.steelDark);
  for (const side of [-1, 1]) {
    limb(ctx, [[cx + side * (e.w / 2 - 4), top + 16], [cx + side * (e.w / 2 + 6), top + 16]], 5, P.steelDark, 2);
  }
  roundRectPath(ctx, sx + 4, top + 8, e.w - 8, e.h - 12, [4, 4, 12, 12]);
  fillAndOutline(ctx, metal, 3);
  roundRectPath(ctx, sx + 1, top + 6, e.w - 2, 6, 3);
  fillAndOutline(ctx, P.steel, 2.5);
  if (e.phase !== 'geyser') {
    ellipsePath(ctx, cx + jiggle, top + 5 - Math.abs(jiggle), e.w / 2 - 2, 6);
    fillAndOutline(ctx, metal, 2.5);
    ellipsePath(ctx, cx + jiggle, top - 2 - Math.abs(jiggle), 5, 3.5);
    fillAndOutline(ctx, '#3a2418', 2);
  }
  if (e.phase === 'rattle') {
    ctx.fillStyle = '#f4fbff';
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(sx + 10 + i * 15, top + 8 + Math.sin(time * 30 + i) * 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    chunkyText(ctx, '!', cx, top - 28, { size: 24, fill: P.uiRed, outline: 4 });
  }
  if (e.phase === 'simmer') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 2; i += 1) {
      const rise = (time * 30 + i * 20) % 40;
      ctx.beginPath();
      ctx.moveTo(cx - 8 + i * 16, top - 4 - rise);
      ctx.quadraticCurveTo(cx - 2 + i * 16, top - 12 - rise, cx - 8 + i * 16, top - 20 - rise);
      ctx.stroke();
    }
  }
}

function paintPotGeyser(ctx, e, sx, time) {
  if (e.phase !== 'geyser') return;
  const cx = sx + e.w / 2;
  const top = GROUND_Y - e.h;
  const progress = 1 - e.timer / POT_TIMING.geyser;
  const height = 190 * Math.min(1, progress * 5) * (progress > 0.8 ? (1 - progress) / 0.2 : 1);
  const column = ctx.createLinearGradient(0, top - height, 0, top);
  column.addColorStop(0, 'rgba(230, 246, 255, 0.95)');
  column.addColorStop(1, 'rgba(160, 210, 240, 0.95)');
  ctx.beginPath();
  ctx.moveTo(cx - 20, top + 4);
  ctx.quadraticCurveTo(cx - 14 + Math.sin(time * 18) * 3, top - height * 0.5, cx - 8, top - height);
  ctx.quadraticCurveTo(cx, top - height - 16, cx + 8, top - height);
  ctx.quadraticCurveTo(cx + 14 + Math.sin(time * 21) * 3, top - height * 0.5, cx + 20, top + 4);
  ctx.closePath();
  fillAndOutline(ctx, column, 2.5, '#3c6e8c');
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i += 1) {
    const spread = ((time * 3 + i * 0.37) % 1) * 46;
    ctx.beginPath();
    ctx.arc(cx + (i % 2 ? spread : -spread), top - height + 10 + spread * 1.2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(cx + 12, top - height - 22);
  ctx.rotate(time * 9);
  ellipsePath(ctx, 0, 0, e.w / 2 - 4, 5.5);
  fillAndOutline(ctx, P.steel, 2.5);
  ctx.restore();
}

function paintRollingPin(ctx, e, sx) {
  const cy = GROUND_Y - e.h / 2;
  groundShadow(ctx, sx + e.w / 2, GROUND_Y, e.w * 0.55);
  limb(ctx, [[sx - 8, cy], [sx + 8, cy]], 7, P.woodDark, 2);
  limb(ctx, [[sx + e.w - 8, cy], [sx + e.w + 8, cy]], 7, P.woodDark, 2);
  roundRectPath(ctx, sx + 6, cy - e.h / 2, e.w - 12, e.h, e.h / 2);
  const wood = ctx.createLinearGradient(0, cy - e.h / 2, 0, cy + e.h / 2);
  wood.addColorStop(0, '#e6b97e');
  wood.addColorStop(1, P.woodLight);
  fillAndOutline(ctx, wood, 3);
  ctx.save();
  roundRectPath(ctx, sx + 6, cy - e.h / 2, e.w - 12, e.h, e.h / 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(94, 58, 32, 0.5)';
  ctx.lineWidth = 2;
  const offset = ((e.angle * 12) % 16 + 16) % 16;
  for (let lx = sx + offset; lx < sx + e.w; lx += 16) {
    ctx.beginPath();
    ctx.moveTo(lx, cy - e.h / 2);
    ctx.lineTo(lx - 6, cy + e.h / 2);
    ctx.stroke();
  }
  ctx.restore();
}

function paintTableBack(ctx, e, sx) {
  groundShadow(ctx, sx + e.w / 2, GROUND_Y, e.w * 0.6, 0.3);
  ctx.fillStyle = P.woodDark;
  for (const lx of [sx + 26, sx + e.w - 34]) ctx.fillRect(lx, GROUND_Y - e.clearance - 20, 8, e.clearance + 16);
}

function paintTableFront(ctx, e, sx, time) {
  const clothBottom = GROUND_Y - e.clearance;
  const topY = clothBottom - 48;
  for (const lx of [sx + 3, sx + e.w - 13]) {
    roundRectPath(ctx, lx, clothBottom - 4, 10, e.clearance + 4, 2);
    fillAndOutline(ctx, P.wood, 2.5);
  }
  const clothPath = () => {
    ctx.beginPath();
    ctx.moveTo(sx - 6, topY + 6);
    ctx.lineTo(sx + e.w + 6, topY + 6);
    ctx.lineTo(sx + e.w + 6, clothBottom - 6);
    const scallops = 8;
    for (let i = scallops; i > 0; i -= 1) {
      const x1 = sx - 6 + ((e.w + 12) * (i - 0.5)) / scallops;
      const x2 = sx - 6 + ((e.w + 12) * (i - 1)) / scallops;
      ctx.quadraticCurveTo(x1, clothBottom + 6, x2, clothBottom - 6);
    }
    ctx.closePath();
  };
  clothPath();
  ctx.fillStyle = '#fbf3e6';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(196, 52, 40, 0.75)';
  for (let gx = sx - 6; gx < sx + e.w + 6; gx += 14) ctx.fillRect(gx, topY, 7, clothBottom - topY + 8);
  ctx.fillStyle = 'rgba(196, 52, 40, 0.5)';
  for (let gy = topY + 6; gy < clothBottom + 8; gy += 14) ctx.fillRect(sx - 6, gy, e.w + 12, 7);
  ctx.restore();
  clothPath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  roundRectPath(ctx, sx - 10, topY, e.w + 20, 9, 3);
  fillAndOutline(ctx, P.woodLight, 3);
  const pieX = sx + 44;
  ellipsePath(ctx, pieX, topY - 4, 26, 8);
  fillAndOutline(ctx, '#d99a4e', 2.5);
  ctx.strokeStyle = '#a8642a';
  ctx.lineWidth = 2;
  for (const dx of [-14, -4, 6, 16]) {
    ctx.beginPath();
    ctx.moveTo(pieX + dx, topY - 10);
    ctx.lineTo(pieX + dx + 4, topY + 2);
    ctx.stroke();
  }
  const boatX = sx + e.w - 46;
  ctx.beginPath();
  ctx.moveTo(boatX - 18, topY - 10);
  ctx.quadraticCurveTo(boatX, topY + 4, boatX + 20, topY - 14);
  ctx.lineTo(boatX + 12, topY - 8);
  ctx.quadraticCurveTo(boatX, topY - 4, boatX - 18, topY - 10);
  ctx.closePath();
  fillAndOutline(ctx, P.cream, 2.5);
  const candleFlicker = Math.sin(time * 14 + e.id) * 1.5;
  roundRectPath(ctx, sx + e.w / 2 - 3, topY - 26, 6, 22, 2);
  fillAndOutline(ctx, '#f4e4c1', 2);
  ellipsePath(ctx, sx + e.w / 2, topY - 31 + candleFlicker * 0.3, 3, 5 + candleFlicker * 0.4);
  ctx.fillStyle = P.fireMid;
  ctx.fill();
}

function paintKnife(ctx, e, sx) {
  const y = e.y - e.h / 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(sx - 50 - i * 14, y - 5 + i * 5);
    ctx.lineTo(sx - 6, y - 5 + i * 5);
    ctx.stroke();
  }
  roundRectPath(ctx, sx, y - 5.5, 25, 11, 4);
  fillAndOutline(ctx, '#3a2418', 2);
  ctx.fillStyle = P.ovenChrome;
  for (const rx of [sx + 7, sx + 17]) {
    ctx.beginPath();
    ctx.arc(rx, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  roundRectPath(ctx, sx + 24, y - 7, 5, 14, 1.5);
  fillAndOutline(ctx, P.steelDark, 1.5);
  ctx.beginPath();
  ctx.moveTo(sx + 29, y - 6);
  ctx.lineTo(sx + e.w - 12, y - 5);
  ctx.quadraticCurveTo(sx + e.w + 3, y - 3, sx + e.w + 2, y + 1);
  ctx.lineTo(sx + 29, y + 6);
  ctx.closePath();
  const blade = ctx.createLinearGradient(0, y - 6, 0, y + 6);
  blade.addColorStop(0, '#ffffff');
  blade.addColorStop(0.5, P.steel);
  blade.addColorStop(1, P.steelDark);
  fillAndOutline(ctx, blade, 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sx + 34, y - 2);
  ctx.lineTo(sx + e.w - 14, y - 1.5);
  ctx.stroke();
}

// ---------------------------------------------------------------- porch

function paintRockingChair(ctx, e, sx) {
  const cx = sx + e.w / 2;
  groundShadow(ctx, cx, GROUND_Y, e.w * 0.56);
  ctx.save();
  ctx.translate(cx, GROUND_Y);
  ctx.rotate(Math.sin(e.rock * 2.4) * 0.12);
  ctx.beginPath();
  ctx.moveTo(-e.w / 2 - 6, -10);
  ctx.quadraticCurveTo(0, 6, e.w / 2 + 6, -10);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = P.woodLight;
  ctx.lineWidth = 5;
  ctx.stroke();
  for (const lx of [-24, 22]) limb(ctx, [[lx, -4], [lx, -30]], 5, P.wood, 2);
  roundRectPath(ctx, -32, -34, 64, 9, 3);
  fillAndOutline(ctx, P.woodLight, 2.5);
  roundRectPath(ctx, -32, -e.h, 12, 34, 3);
  fillAndOutline(ctx, P.wood, 2.5);
  for (let i = 0; i < 3; i += 1) limb(ctx, [[-26, -e.h + 6 + i * 9], [-26, -e.h + 10 + i * 9]], 2, P.woodDark, 0);
  ctx.beginPath();
  ctx.moveTo(-20, -34);
  ctx.quadraticCurveTo(-2, -48, 18, -34);
  ctx.lineTo(14, -26);
  ctx.quadraticCurveTo(-2, -36, -20, -26);
  ctx.closePath();
  fillAndOutline(ctx, '#7a9a4a', 2);
  ctx.restore();
}

// ---------------------------------------------------------------- stage doors and the finish

const GATE_STYLES = {
  1: { wall: P.barnRed, wallLine: P.barnRedDark, trim: P.trim, sign: 'THE BIG RED BARN', signFill: P.trim, signText: P.barnRed },
  2: { wall: '#efe2c4', wallLine: '#cdb88f', trim: '#ffffff', sign: "GRANDMA'S KITCHEN", signFill: P.wood, signText: P.trim },
  3: { wall: '#d6c3a0', wallLine: '#b39c74', trim: '#ffffff', sign: 'FRONT PORCH', signFill: P.cabinet, signText: P.trim },
};

function paintGateBack(ctx, e, sx) {
  const style = GATE_STYLES[e.stageIndex] ?? GATE_STYLES[1];
  const lintelY = GROUND_Y - 236;
  ctx.fillStyle = style.wall;
  ctx.fillRect(sx - 60, 0, e.w + 120, lintelY);
  ctx.strokeStyle = style.wallLine;
  ctx.lineWidth = 2;
  for (let ly = 18; ly < lintelY; ly += 18) {
    ctx.beginPath();
    ctx.moveTo(sx - 60, ly);
    ctx.lineTo(sx + e.w + 60, ly);
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(sx - 60, -4, e.w + 120, lintelY + 4);
  const doorway = ctx.createLinearGradient(sx, 0, sx + e.w, 0);
  doorway.addColorStop(0, '#2a1a12');
  doorway.addColorStop(0.5, '#4a2e1c');
  doorway.addColorStop(1, '#2a1a12');
  ctx.fillStyle = doorway;
  ctx.fillRect(sx + 18, lintelY, e.w - 36, GROUND_Y - lintelY);
  ctx.fillStyle = P.woodDark;
  ctx.fillRect(sx - 14, GROUND_Y, e.w + 28, 600 - GROUND_Y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  for (let px = sx - 14; px < sx + e.w + 14; px += 22) {
    ctx.beginPath();
    ctx.moveTo(px, GROUND_Y);
    ctx.lineTo(px, 600);
    ctx.stroke();
  }
  roundRectPath(ctx, sx - 30, lintelY - 64, e.w + 60, 40, 6);
  fillAndOutline(ctx, style.signFill, 3);
  chunkyText(ctx, style.sign, sx + e.w / 2, lintelY - 44, { size: 16, fill: style.signText, outline: 0, shadow: false });
}

function paintGateFront(ctx, e, sx) {
  const style = GATE_STYLES[e.stageIndex] ?? GATE_STYLES[1];
  const lintelY = GROUND_Y - 236;
  for (const px of [sx, sx + e.w - 20]) {
    roundRectPath(ctx, px, lintelY, 20, GROUND_Y - lintelY, 2);
    fillAndOutline(ctx, style.trim, 3);
  }
  roundRectPath(ctx, sx - 8, lintelY - 14, e.w + 16, 18, 3);
  fillAndOutline(ctx, style.trim, 3);
  if (e.stageIndex === 1) {
    for (const [doorX, skew] of [[sx - 52, 0.35], [sx + e.w + 4, -0.35]]) {
      ctx.save();
      ctx.translate(doorX + 24, lintelY);
      ctx.transform(1, skew * 0.2, 0, 1, 0, 0);
      roundRectPath(ctx, -24, 0, 48, GROUND_Y - lintelY, 2);
      fillAndOutline(ctx, P.barnRed, 3);
      ctx.strokeStyle = P.trim;
      ctx.lineWidth = 5;
      ctx.strokeRect(-20, 4, 40, GROUND_Y - lintelY - 8);
      ctx.beginPath();
      ctx.moveTo(-20, 4);
      ctx.lineTo(20, GROUND_Y - lintelY - 4);
      ctx.moveTo(20, 4);
      ctx.lineTo(-20, GROUND_Y - lintelY - 4);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function paintFinishBack(ctx, e, sx) {
  const archY = GROUND_Y - 250;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(sx + 10, GROUND_Y);
  ctx.lineTo(sx + 10, archY + 40);
  ctx.quadraticCurveTo(sx + e.w / 2, archY - 30, sx + e.w - 10, archY + 40);
  ctx.lineTo(sx + e.w - 10, GROUND_Y);
  ctx.stroke();
  ctx.strokeStyle = P.woodLight;
  ctx.lineWidth = 5;
  ctx.stroke();
  roundRectPath(ctx, sx + 10, archY - 6, e.w - 20, 44, 8);
  fillAndOutline(ctx, P.leaf, 3);
  chunkyText(ctx, 'THE WOODS', sx + e.w / 2, archY + 8, { size: 16, fill: P.trim, outline: 0, shadow: false });
  chunkyText(ctx, 'FREEDOM →', sx + e.w / 2, archY + 27, { size: 12, fill: P.gold, outline: 0, shadow: false });
}

function paintFinishFront(ctx, e, sx) {
  ctx.save();
  ctx.translate(sx - 10, GROUND_Y);
  ctx.transform(0.55, -0.12, 0, 1, 0, 0);
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 16, 0);
    ctx.lineTo(i * 16, -70);
    ctx.lineTo(i * 16 + 6, -80);
    ctx.lineTo(i * 16 + 12, -70);
    ctx.lineTo(i * 16 + 12, 0);
    ctx.closePath();
    fillAndOutline(ctx, '#ffffff', 2.5);
  }
  roundRectPath(ctx, -4, -56, 84, 9, 2);
  fillAndOutline(ctx, '#f1ebe0', 2.5);
  roundRectPath(ctx, -4, -24, 84, 9, 2);
  fillAndOutline(ctx, '#f1ebe0', 2.5);
  ctx.restore();
}

const PAINTERS = {
  haybale: { floor: paintHaybale },
  baleStack: { floor: paintBaleStack },
  fence: { floor: paintFence },
  mud: { floor: paintMud },
  pumpkin: { floor: paintPumpkin },
  chicken: { floor: paintChicken },
  corn: { floor: paintCorn },
  goldenCorn: { floor: paintGoldenCorn },
  featherPickup: { floor: paintFeatherPickup },
  haystack: { back: paintHaystack },
  barrel: { back: paintBarrel },
  pantry: { back: paintPantry },
  beam: { front: paintBeam },
  lantern: { front: paintLantern },
  pitchforks: { floor: paintPitchforks },
  oven: { back: paintOvenBody, front: paintOvenFlames },
  pot: { floor: paintPot, front: paintPotGeyser },
  rollingPin: { floor: paintRollingPin },
  table: { back: paintTableBack, front: paintTableFront },
  knife: { front: paintKnife },
  rockingChair: { floor: paintRockingChair },
  gate: { back: paintGateBack, front: paintGateFront },
  finishGate: { back: paintFinishBack, front: paintFinishFront },
};

export function drawProps(ctx, entities, cameraX, layer, time) {
  for (const entity of entities) {
    if (entity.gone) continue;
    const sx = entity.x - cameraX;
    if (sx > 1260 || sx + entity.w < -300) continue;
    const painter = PAINTERS[entity.kind]?.[layer];
    if (painter) painter(ctx, entity, sx, time);
  }
}

export function isPastFinish(worldX) {
  return worldX >= ROUTE_END_X;
}
