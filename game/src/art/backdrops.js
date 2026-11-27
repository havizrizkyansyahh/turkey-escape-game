// The stage backdrops — the farmyard at sunrise, the barn, Grandma's kitchen, the front porch at
// dusk and the woods past the finish — painted in parallax layers that scroll slower the further
// away they are. Scenery positions come from hashNoise, so nothing is stored and every spot of
// the route always looks the same.

import { GROUND_Y, VIEW_WIDTH, VIEW_HEIGHT, ROUTE_END_X } from '../config.js';
import { stageStartX } from '../stages.js';
import { hashNoise } from '../random.js';
import { PALETTE as P, INK } from './palette.js';
import { ellipsePath, roundRectPath, fillAndOutline, chunkyText, limb, star } from './brush.js';
import { drawTurkey } from './turkey-art.js';

function forEachTile(cameraX, depth, tileWidth, paint) {
  const offset = cameraX * depth;
  const first = Math.floor(offset / tileWidth) - 1;
  const last = Math.floor((offset + VIEW_WIDTH) / tileWidth) + 1;
  for (let index = first; index <= last; index += 1) paint(index * tileWidth - offset, index);
}

function paintSky(ctx, top, mid, low) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, top);
  sky.addColorStop(0.55, mid);
  sky.addColorStop(1, low);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_WIDTH, GROUND_Y + 2);
}

function paintSun(ctx, x, y, radius, color, glowColor) {
  const glow = ctx.createRadialGradient(x, y, radius * 0.6, x, y, radius * 3.2);
  glow.addColorStop(0, glowColor);
  glow.addColorStop(1, 'rgba(255, 240, 200, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius * 3.2, y - radius * 3.2, radius * 6.4, radius * 6.4);
  ellipsePath(ctx, x, y, radius, radius);
  ctx.fillStyle = color;
  ctx.fill();
}

// Several overlapping ellipses with one clean outline: strokes first, fills on top.
function puffs(ctx, shapes, fill, outline = null, outlineWidth = 2) {
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = outlineWidth * 2;
    for (const [x, y, rx, ry] of shapes) {
      ellipsePath(ctx, x, y, rx, ry);
      ctx.stroke();
    }
  }
  ctx.fillStyle = fill;
  for (const [x, y, rx, ry] of shapes) {
    ellipsePath(ctx, x, y, rx, ry);
    ctx.fill();
  }
}

function paintCloud(ctx, x, y, scale, color) {
  puffs(ctx, [[x, y, 32 * scale, 20 * scale], [x + 30 * scale, y - 10 * scale, 34 * scale, 24 * scale], [x + 62 * scale, y, 28 * scale, 18 * scale], [x + 30 * scale, y + 6 * scale, 40 * scale, 16 * scale]], color);
}

function hillHeight(worldX, seed) {
  return 0.55 + 0.25 * Math.sin(worldX * 0.0042 + seed) + 0.2 * Math.sin(worldX * 0.0113 + seed * 2.3);
}

function paintHills(ctx, cameraX, depth, baseY, amplitude, color, seed) {
  const offset = cameraX * depth;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 2);
  for (let x = 0; x <= VIEW_WIDTH + 16; x += 16) ctx.lineTo(x, baseY - amplitude * hillHeight(x + offset, seed));
  ctx.lineTo(VIEW_WIDTH, GROUND_Y + 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function paintRoundTree(ctx, x, groundY, size, leaves, trunk, outline = null) {
  ctx.fillStyle = trunk;
  ctx.fillRect(x - size * 0.08, groundY - size * 0.9, size * 0.16, size * 0.9);
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - size * 0.08, groundY - size * 0.9, size * 0.16, size * 0.9);
  }
  puffs(
    ctx,
    [
      [x, groundY - size * 1.3, size * 0.55, size * 0.5],
      [x - size * 0.42, groundY - size * 0.98, size * 0.45, size * 0.4],
      [x + size * 0.42, groundY - size * 1.0, size * 0.46, size * 0.42],
      [x, groundY - size * 0.84, size * 0.5, size * 0.36],
    ],
    leaves,
    outline,
    1.5,
  );
}

function paintPine(ctx, x, groundY, size, color) {
  ctx.fillStyle = color;
  for (let tier = 0; tier < 3; tier += 1) {
    const w = size * (0.62 - tier * 0.14);
    const base = groundY - size * 0.2 - tier * size * 0.32;
    ctx.beginPath();
    ctx.moveTo(x - w, base);
    ctx.lineTo(x, base - size * 0.5);
    ctx.lineTo(x + w, base);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(x - size * 0.05, groundY - size * 0.22, size * 0.1, size * 0.22);
}

// ---------------------------------------------------------------- the farmyard

function paintFarmBuilding(ctx, x, groundY, kind, time) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  if (kind === 0) {
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x, groundY - 70);
    ctx.lineTo(x + 18, groundY - 104);
    ctx.lineTo(x + 70, groundY - 122);
    ctx.lineTo(x + 122, groundY - 104);
    ctx.lineTo(x + 140, groundY - 70);
    ctx.lineTo(x + 140, groundY);
    ctx.closePath();
    fillAndOutline(ctx, '#b4473a', 2, '#6e2a20');
    ctx.strokeStyle = '#f4e6d0';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 48, groundY - 56, 44, 56);
    ctx.beginPath();
    ctx.moveTo(x + 48, groundY - 56);
    ctx.lineTo(x + 92, groundY);
    ctx.moveTo(x + 92, groundY - 56);
    ctx.lineTo(x + 48, groundY);
    ctx.stroke();
    ctx.strokeRect(x + 58, groundY - 96, 24, 22);
  } else if (kind === 1) {
    roundRectPath(ctx, x + 20, groundY - 150, 46, 150, [23, 23, 0, 0]);
    fillAndOutline(ctx, '#c9c3b8', 2, '#7a7066');
    ctx.strokeStyle = '#9a9184';
    ctx.lineWidth = 2;
    for (let band = 1; band < 6; band += 1) {
      ctx.beginPath();
      ctx.moveTo(x + 20, groundY - band * 24);
      ctx.lineTo(x + 66, groundY - band * 24);
      ctx.stroke();
    }
    roundRectPath(ctx, x + 66, groundY - 76, 70, 76, 2);
    fillAndOutline(ctx, '#b4473a', 2, '#6e2a20');
  } else if (kind === 2) {
    ctx.strokeStyle = '#6e5a48';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 40, groundY);
    ctx.lineTo(x + 60, groundY - 130);
    ctx.lineTo(x + 80, groundY);
    ctx.moveTo(x + 46, groundY - 40);
    ctx.lineTo(x + 74, groundY - 40);
    ctx.moveTo(x + 52, groundY - 85);
    ctx.lineTo(x + 68, groundY - 85);
    ctx.stroke();
    ctx.save();
    ctx.translate(x + 60, groundY - 132);
    ctx.rotate(time * 1.4);
    ctx.fillStyle = '#efe6d6';
    for (let blade = 0; blade < 4; blade += 1) {
      ctx.rotate(Math.PI / 2);
      ctx.fillRect(-3, -44, 7, 40);
    }
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x, groundY - 64);
    ctx.lineTo(x + 60, groundY - 104);
    ctx.lineTo(x + 120, groundY - 64);
    ctx.lineTo(x + 120, groundY);
    ctx.closePath();
    fillAndOutline(ctx, '#f3e8d4', 2, '#8a7a62');
    ctx.fillStyle = '#ffcf6e';
    for (const wx of [x + 18, x + 82]) ctx.fillRect(wx, groundY - 50, 20, 20);
    ctx.fillStyle = '#7a5a40';
    ctx.fillRect(x + 50, groundY - 40, 20, 40);
    ctx.fillStyle = '#8a3a2e';
    ctx.fillRect(x + 88, groundY - 110, 14, 30);
    ctx.fillStyle = 'rgba(240, 235, 225, 0.6)';
    for (let puff = 0; puff < 3; puff += 1) {
      const rise = (time * 14 + puff * 16) % 48;
      ellipsePath(ctx, x + 96 + rise * 0.4, groundY - 118 - rise, 6 + rise * 0.15, 5 + rise * 0.12);
      ctx.fill();
    }
  }
  ctx.restore();
}

function paintCornStalks(ctx, x, groundY, count) {
  for (let i = 0; i < count; i += 1) {
    const sx = x + i * 11;
    const h = 64 + ((i * 37) % 22);
    ctx.strokeStyle = '#a88a3c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx, groundY);
    ctx.quadraticCurveTo(sx + 3, groundY - h * 0.6, sx - 2, groundY - h);
    ctx.stroke();
    ctx.fillStyle = '#c9a54c';
    for (const leafY of [0.35, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(sx, groundY - h * leafY);
      ctx.quadraticCurveTo(sx + 14, groundY - h * leafY - 10, sx + 20, groundY - h * leafY + 4);
      ctx.quadraticCurveTo(sx + 10, groundY - h * leafY - 2, sx, groundY - h * leafY);
      ctx.fill();
    }
  }
}

function paintFarmGround(ctx, cameraX) {
  const dirt = ctx.createLinearGradient(0, GROUND_Y, 0, VIEW_HEIGHT);
  dirt.addColorStop(0, P.dirt);
  dirt.addColorStop(1, P.dirtDark);
  ctx.fillStyle = dirt;
  ctx.fillRect(0, GROUND_Y, VIEW_WIDTH, VIEW_HEIGHT - GROUND_Y);
  ctx.fillStyle = P.grass;
  ctx.fillRect(0, GROUND_Y - 8, VIEW_WIDTH, 11);
  forEachTile(cameraX, 1, 24, (sx, i) => {
    const h = 6 + hashNoise(i * 5) * 9;
    ctx.fillStyle = hashNoise(i * 9) > 0.5 ? P.grass : P.grassDark;
    ctx.beginPath();
    ctx.moveTo(sx, GROUND_Y - 5);
    ctx.lineTo(sx + 4, GROUND_Y - 5 - h);
    ctx.lineTo(sx + 9, GROUND_Y - 5);
    ctx.fill();
  });
  forEachTile(cameraX, 1, 96, (sx, i) => {
    ctx.fillStyle = 'rgba(110, 72, 38, 0.45)';
    ellipsePath(ctx, sx + hashNoise(i * 3) * 80, GROUND_Y + 30 + hashNoise(i * 4) * 60, 6 + hashNoise(i) * 6, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 230, 190, 0.35)';
    ellipsePath(ctx, sx + hashNoise(i * 6) * 90, GROUND_Y + 20 + hashNoise(i * 8) * 80, 3, 2);
    ctx.fill();
    if (hashNoise(i * 11) > 0.45) {
      const lx = sx + hashNoise(i * 12) * 90;
      const ly = GROUND_Y + 14 + hashNoise(i * 13) * 70;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(hashNoise(i * 14) * 6);
      ctx.fillStyle = [P.maple, P.amber, P.gold][Math.floor(hashNoise(i * 15) * 3)];
      star(ctx, 0, 0, 7, 3.5, 5);
      ctx.fill();
      ctx.restore();
    }
  });
  ctx.strokeStyle = 'rgba(43, 26, 18, 0.55)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 2);
  ctx.lineTo(VIEW_WIDTH, GROUND_Y + 2);
  ctx.stroke();
}

function paintFarmyard(ctx, cameraX, time) {
  paintSky(ctx, P.skyTop, P.skyMid, P.skyLow);
  paintSun(ctx, 730, 150, 46, P.sun, 'rgba(255, 236, 180, 0.75)');
  forEachTile(cameraX + time * 12, 0.05, 520, (sx, i) => {
    const n = hashNoise(i * 3 + 1);
    if (n > 0.3) paintCloud(ctx, sx + n * 220, 60 + hashNoise(i * 7) * 90, 0.7 + n * 0.6, 'rgba(255, 247, 230, 0.85)');
  });
  paintHills(ctx, cameraX, 0.1, GROUND_Y - 140, 70, P.hillFar, 1.3);
  forEachTile(cameraX, 0.1, 70, (sx, i) => {
    if (hashNoise(i * 19) < 0.35) return;
    const groundY = GROUND_Y - 140 - 70 * hillHeight(sx + 35 + cameraX * 0.1, 1.3) + 8;
    const color = ['#d9733f', '#e2994a', '#c8583a', '#e6b052'][Math.floor(hashNoise(i * 23) * 4)];
    paintRoundTree(ctx, sx + 35, groundY, 26 + hashNoise(i * 29) * 14, color, '#8a5a3c');
  });
  paintHills(ctx, cameraX, 0.24, GROUND_Y - 70, 44, P.hillNear, 4.1);
  forEachTile(cameraX, 0.38, 640, (sx, i) => {
    const kind = Math.floor(hashNoise(i * 41) * 4);
    paintFarmBuilding(ctx, sx + hashNoise(i * 43) * 300, GROUND_Y - 34, kind, time);
  });
  forEachTile(cameraX, 0.55, 180, (sx, i) => {
    const n = hashNoise(i * 53);
    if (n > 0.55) paintRoundTree(ctx, sx + 60, GROUND_Y - 22, 46 + n * 20, [P.maple, P.amber, P.gold][Math.abs(i) % 3], P.woodDark, 'rgba(43, 26, 18, 0.55)');
  });
  forEachTile(cameraX, 0.74, 64, (sx, i) => {
    ctx.fillStyle = '#9a6a42';
    ctx.fillRect(sx + 26, GROUND_Y - 54, 9, 50);
    ctx.fillStyle = '#b7865a';
    ctx.fillRect(sx, GROUND_Y - 46, 64, 7);
    ctx.fillRect(sx, GROUND_Y - 26, 64, 7);
    if (hashNoise(i * 61) > 0.72) paintCornStalks(ctx, sx + 8, GROUND_Y - 6, 4);
    if (hashNoise(i * 67) > 0.86) {
      ellipsePath(ctx, sx + 44, GROUND_Y - 16, 13, 10);
      fillAndOutline(ctx, P.pumpkin, 2);
    }
  });
  paintFarmGround(ctx, cameraX);
}

// ---------------------------------------------------------------- the barn

function paintBarnInterior(ctx, cameraX, time) {
  ctx.fillStyle = '#5a271a';
  ctx.fillRect(0, 0, VIEW_WIDTH, GROUND_Y);
  forEachTile(cameraX, 0.55, 36, (sx, i) => {
    const n = hashNoise(i * 7 + 3);
    ctx.fillStyle = n > 0.66 ? '#7b3423' : n > 0.33 ? '#86392a' : '#702f20';
    ctx.fillRect(sx + 1, 0, 34, GROUND_Y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(sx, 0, 2, GROUND_Y);
    if (hashNoise(i * 13) > 0.7) {
      ellipsePath(ctx, sx + 18, 120 + hashNoise(i * 17) * 260, 4, 7);
      ctx.fillStyle = 'rgba(40, 14, 8, 0.45)';
      ctx.fill();
    }
  });
  forEachTile(cameraX, 0.55, 840, (sx) => {
    const wx = sx + 320;
    const shaft = ctx.createLinearGradient(wx, 80, wx + 200, GROUND_Y);
    shaft.addColorStop(0, 'rgba(255, 214, 140, 0.32)');
    shaft.addColorStop(1, 'rgba(255, 214, 140, 0)');
    ctx.fillStyle = shaft;
    ctx.beginPath();
    ctx.moveTo(wx, 74);
    ctx.lineTo(wx + 96, 74);
    ctx.lineTo(wx + 330, GROUND_Y);
    ctx.lineTo(wx + 150, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    roundRectPath(ctx, wx, 70, 96, 84, 4);
    fillAndOutline(ctx, '#ffd59a', 4, '#3e1a10');
    ctx.strokeStyle = '#3e1a10';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(wx + 48, 70);
    ctx.lineTo(wx + 48, 154);
    ctx.moveTo(wx, 112);
    ctx.lineTo(wx + 96, 112);
    ctx.stroke();
  });
  forEachTile(cameraX, 0.55, 420, (sx) => {
    ctx.fillStyle = '#4a2015';
    ctx.fillRect(sx, 0, 26, GROUND_Y);
    ctx.fillRect(sx - 210, 188, 420, 20);
    ctx.save();
    ctx.strokeStyle = '#4a2015';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(sx + 13, 260);
    ctx.lineTo(sx + 110, 198);
    ctx.stroke();
    ctx.restore();
  });
  forEachTile(cameraX, 0.65, 600, (sx, i) => {
    ctx.fillStyle = '#6a3a22';
    ctx.fillRect(sx, 196, 340, 16);
    puffs(ctx, [[sx + 40, 192, 50, 18], [sx + 120, 188, 60, 22], [sx + 220, 192, 56, 18], [sx + 300, 194, 40, 14]], P.hay, null);
    ctx.strokeStyle = P.hayDark;
    ctx.lineWidth = 2;
    for (let k = 0; k < 9; k += 1) {
      const strawX = sx + 20 + k * 36;
      ctx.beginPath();
      ctx.moveTo(strawX, 210);
      ctx.lineTo(strawX + 4, 228 + hashNoise(i * 9 + k) * 14);
      ctx.stroke();
    }
  });
  forEachTile(cameraX, 0.8, 520, (sx, i) => {
    const stallX = sx + 30;
    roundRectPath(ctx, stallX, GROUND_Y - 120, 150, 112, 3);
    fillAndOutline(ctx, '#8c4a2c', 3, '#3e1a10');
    ctx.strokeStyle = P.trim;
    ctx.lineWidth = 5;
    ctx.strokeRect(stallX + 8, GROUND_Y - 112, 134, 96);
    ctx.beginPath();
    ctx.moveTo(stallX + 8, GROUND_Y - 112);
    ctx.lineTo(stallX + 142, GROUND_Y - 16);
    ctx.moveTo(stallX + 142, GROUND_Y - 112);
    ctx.lineTo(stallX + 8, GROUND_Y - 16);
    ctx.stroke();
    if (hashNoise(i * 71) > 0.4) {
      roundRectPath(ctx, sx + 250, GROUND_Y - 190, 120, 80, 6);
      fillAndOutline(ctx, '#2e3b33', 4, '#5e3a20');
      chunkyText(ctx, 'MENU', sx + 310, GROUND_Y - 172, { size: 15, fill: '#f4f1e8', outline: 0, shadow: false });
      chunkyText(ctx, '1. TURKEY', sx + 310, GROUND_Y - 148, { size: 12, fill: '#f4f1e8', outline: 0, shadow: false });
      ctx.strokeStyle = '#f4f1e8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx + 268, GROUND_Y - 130);
      ctx.lineTo(sx + 352, GROUND_Y - 130);
      ctx.stroke();
    }
    puffs(ctx, [[sx + 440, GROUND_Y - 14, 60, 30], [sx + 470, GROUND_Y - 40, 40, 26]], P.hayDark, '#6b4a1a', 1.5);
  });
  ctx.fillStyle = '#7a4a2a';
  ctx.fillRect(0, GROUND_Y, VIEW_WIDTH, VIEW_HEIGHT - GROUND_Y);
  forEachTile(cameraX, 1, 120, (sx, i) => {
    ctx.fillStyle = hashNoise(i * 5) > 0.5 ? '#86532f' : '#704325';
    ctx.fillRect(sx, GROUND_Y + 2, 119, 36);
    ctx.fillStyle = hashNoise(i * 6) > 0.5 ? '#704325' : '#86532f';
    ctx.fillRect(sx + 60, GROUND_Y + 40, 119, 36);
    ctx.fillRect(sx - 60, GROUND_Y + 40, 119, 36);
    ctx.fillStyle = '#5e3a20';
    ctx.fillRect(sx + 20, GROUND_Y + 78, 119, 36);
    ctx.strokeStyle = P.hay;
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k += 1) {
      const hx = sx + hashNoise(i * 7 + k) * 110;
      const hy = GROUND_Y + 8 + hashNoise(i * 8 + k) * 90;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + 12, hy - 3);
      ctx.stroke();
    }
  });
  ctx.strokeStyle = 'rgba(43, 26, 18, 0.6)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 1);
  ctx.lineTo(VIEW_WIDTH, GROUND_Y + 1);
  ctx.stroke();
}

// ---------------------------------------------------------------- Grandma's kitchen

function paintWantedPoster(ctx, x, y, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.04);
  roundRectPath(ctx, 0, 0, 96, 128, 3);
  fillAndOutline(ctx, '#f3e2b8', 2.5, '#6b4a2a');
  chunkyText(ctx, 'WANTED', 48, 16, { size: 15, fill: '#7a2a1a', outline: 0, shadow: false });
  ctx.save();
  ctx.beginPath();
  ctx.rect(14, 28, 68, 62);
  ctx.fillStyle = '#e8d3a2';
  ctx.fill();
  ctx.clip();
  drawTurkey(ctx, 42, 92, { pose: 'idle', phase: 0, scale: 0.62, blink: time % 3 < 0.1 }, time);
  ctx.restore();
  ctx.strokeStyle = '#6b4a2a';
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 28, 68, 62);
  chunkyText(ctx, 'FOR DINNER', 48, 103, { size: 10, fill: '#3a2418', outline: 0, shadow: false });
  chunkyText(ctx, 'TOM WATTLE', 48, 117, { size: 9, fill: '#7a2a1a', outline: 0, shadow: false });
  ctx.restore();
}

function paintKitchenWindow(ctx, x, y, w, h) {
  roundRectPath(ctx, x, y, w, h, 4);
  const view = ctx.createLinearGradient(0, y, 0, y + h);
  view.addColorStop(0, '#f6b26b');
  view.addColorStop(1, '#fde2b0');
  fillAndOutline(ctx, view, 5, '#f8f1e4');
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 4);
  ctx.clip();
  paintRoundTree(ctx, x + w * 0.3, y + h, 46, P.maple, P.woodDark);
  paintRoundTree(ctx, x + w * 0.75, y + h, 38, P.amber, P.woodDark);
  ctx.restore();
  ctx.strokeStyle = '#f8f1e4';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  for (const side of [-1, 1]) {
    const cx = side < 0 ? x - 8 : x + w + 8;
    ctx.beginPath();
    ctx.moveTo(cx - 22 * side * -1, y - 12);
    ctx.lineTo(cx + 22 * side, y - 12);
    ctx.quadraticCurveTo(cx + 4 * side, y + h * 0.5, cx + 14 * side, y + h + 10);
    ctx.lineTo(cx - 16 * side, y + h + 10);
    ctx.closePath();
    ctx.fillStyle = '#c4473a';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let gx = cx - 30; gx < cx + 30; gx += 10) ctx.fillRect(gx, y - 12, 5, h + 24);
    ctx.restore();
  }
  roundRectPath(ctx, x - 34, y - 18, w + 68, 10, 4);
  fillAndOutline(ctx, P.woodDark, 2);
}

function paintKitchen(ctx, cameraX, time) {
  ctx.fillStyle = P.wallpaper;
  ctx.fillRect(0, 0, VIEW_WIDTH, GROUND_Y);
  forEachTile(cameraX, 0.6, 44, (sx) => {
    ctx.fillStyle = P.wallpaperStripe;
    ctx.fillRect(sx, 0, 16, GROUND_Y);
    ctx.fillStyle = 'rgba(200, 120, 80, 0.35)';
    for (let dy = 30; dy < 330; dy += 60) {
      ctx.beginPath();
      ctx.moveTo(sx + 30, dy - 6);
      ctx.lineTo(sx + 36, dy);
      ctx.lineTo(sx + 30, dy + 6);
      ctx.lineTo(sx + 24, dy);
      ctx.closePath();
      ctx.fill();
    }
  });
  ctx.fillStyle = '#d9b07a';
  ctx.fillRect(0, 0, VIEW_WIDTH, 22);
  forEachTile(cameraX, 0.6, 780, (sx, i) => {
    paintKitchenWindow(ctx, sx + 70, 70, 170, 130);
    roundRectPath(ctx, sx + 320, 34, 230, 116, 4);
    fillAndOutline(ctx, P.cabinet, 3);
    for (const doorX of [sx + 330, sx + 440]) {
      roundRectPath(ctx, doorX, 44, 100, 96, 3);
      fillAndOutline(ctx, '#4b8a86', 2.5);
      ellipsePath(ctx, doorX + (doorX === sx + 330 ? 88 : 12), 120, 3.5, 3.5);
      fillAndOutline(ctx, P.gold, 1.5);
    }
    if (hashNoise(i * 31) > 0.35) paintWantedPoster(ctx, sx + 600, 92, time);
    else {
      ellipsePath(ctx, sx + 650, 120, 34, 34);
      fillAndOutline(ctx, P.cream, 4, P.woodDark);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx + 650, 120);
      ctx.lineTo(sx + 650, 96);
      ctx.moveTo(sx + 650, 120);
      ctx.lineTo(sx + 668, 126);
      ctx.stroke();
      chunkyText(ctx, 'DINNER AT 6!', sx + 650, 176, { size: 13, fill: P.barnRed, outline: 0, shadow: false });
    }
    for (let pot = 0; pot < 3; pot += 1) {
      const hx = sx + 340 + pot * 70;
      ctx.strokeStyle = '#6b4a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx, 150);
      ctx.lineTo(hx, 170);
      ctx.stroke();
      ellipsePath(ctx, hx, 186, 16 - pot * 2, 14 - pot * 2);
      fillAndOutline(ctx, pot === 1 ? '#c98a4a' : '#b8733a', 2.5);
    }
  });
  ctx.fillStyle = P.wainscot;
  ctx.fillRect(0, GROUND_Y - 180, VIEW_WIDTH, 180);
  forEachTile(cameraX, 0.6, 40, (sx) => {
    ctx.fillStyle = 'rgba(90, 50, 25, 0.25)';
    ctx.fillRect(sx, GROUND_Y - 180, 3, 180);
  });
  ctx.fillStyle = '#a86a40';
  ctx.fillRect(0, GROUND_Y - 186, VIEW_WIDTH, 8);
  forEachTile(cameraX, 0.8, 560, (sx, i) => {
    roundRectPath(ctx, sx, GROUND_Y - 132, 300, 126, 3);
    fillAndOutline(ctx, P.cabinet, 3);
    for (let door = 0; door < 3; door += 1) {
      roundRectPath(ctx, sx + 10 + door * 97, GROUND_Y - 112, 87, 98, 3);
      fillAndOutline(ctx, '#4b8a86', 2);
    }
    roundRectPath(ctx, sx - 8, GROUND_Y - 146, 316, 16, 3);
    fillAndOutline(ctx, P.counter, 3);
    roundRectPath(ctx, sx + 20, GROUND_Y - 178, 54, 32, [4, 4, 14, 14]);
    fillAndOutline(ctx, '#e8e0cf', 2.5);
    ellipsePath(ctx, sx + 120, GROUND_Y - 152, 30, 8);
    fillAndOutline(ctx, '#d99a4e', 2.5);
    roundRectPath(ctx, sx + 190, GROUND_Y - 196, 46, 50, 4);
    fillAndOutline(ctx, P.woodDark, 2.5);
    for (let k = 0; k < 3; k += 1) {
      limb(ctx, [[sx + 200 + k * 13, GROUND_Y - 196], [sx + 200 + k * 13, GROUND_Y - 214]], 5, '#2a1a12', 1.5);
      limb(ctx, [[sx + 200 + k * 13, GROUND_Y - 214], [sx + 200 + k * 13, GROUND_Y - 240 - (k === 1 ? 8 : 0)]], 4, P.steel, 1.5);
    }
    if (hashNoise(i * 37) > 0.5) {
      roundRectPath(ctx, sx + 252, GROUND_Y - 186, 40, 40, 6);
      fillAndOutline(ctx, '#f1e5c8', 2.5);
      chunkyText(ctx, 'FLOUR', sx + 272, GROUND_Y - 166, { size: 8, fill: P.woodDark, outline: 0, shadow: false });
    }
  });
  forEachTile(cameraX, 1, 46, (sx, i) => {
    for (let row = 0; row < 3; row += 1) {
      ctx.fillStyle = (i + row) % 2 === 0 ? P.tileLight : P.tileDark;
      ctx.fillRect(sx, GROUND_Y + row * 40, 46, 40);
    }
  });
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(0, GROUND_Y, VIEW_WIDTH, 10);
  ctx.strokeStyle = 'rgba(43, 26, 18, 0.6)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 1);
  ctx.lineTo(VIEW_WIDTH, GROUND_Y + 1);
  ctx.stroke();
}

// ---------------------------------------------------------------- the front porch at dusk

function paintStars(ctx, cameraX, time) {
  forEachTile(cameraX, 0.02, 130, (sx, i) => {
    for (let k = 0; k < 3; k += 1) {
      const x = sx + hashNoise(i * 7 + k) * 130;
      const y = 20 + hashNoise(i * 11 + k) * 200;
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(time * 2 + i + k));
      ctx.fillStyle = `rgba(255, 246, 220, ${twinkle})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.4 + hashNoise(i + k * 3) * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function paintDuskWoods(ctx, cameraX, time) {
  paintSky(ctx, P.duskTop, P.duskMid, P.duskLow);
  paintStars(ctx, cameraX, time);
  paintSun(ctx, 170, 110, 30, '#fff1cf', 'rgba(255, 230, 190, 0.35)');
  paintHills(ctx, cameraX, 0.08, GROUND_Y - 120, 60, '#6d4a74', 2.2);
  forEachTile(cameraX, 0.14, 46, (sx, i) => {
    if (hashNoise(i * 3) < 0.3) return;
    paintPine(ctx, sx + 23, GROUND_Y - 110, 70 + hashNoise(i * 5) * 50, P.pineFar);
  });
  forEachTile(cameraX, 0.3, 90, (sx, i) => {
    const n = hashNoise(i * 13);
    if (n > 0.55) paintPine(ctx, sx + 45, GROUND_Y - 40, 120 + n * 60, P.pine);
    else if (n > 0.25) paintRoundTree(ctx, sx + 45, GROUND_Y - 40, 50 + n * 30, ['#b8542e', '#c9773a', '#9a3f2a'][Math.abs(i) % 3], '#4a2e2a');
  });
}

function paintPorch(ctx, cameraX, time) {
  paintDuskWoods(ctx, cameraX, time);
  forEachTile(cameraX, 0.92, 320, (sx) => {
    ctx.fillStyle = '#e8dcc4';
    ctx.fillRect(sx + 10, 40, 16, GROUND_Y - 100);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 10, 40, 16, GROUND_Y - 100);
    ctx.strokeStyle = '#3a2e22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + 170, 40);
    ctx.lineTo(sx + 170, 72);
    ctx.stroke();
    const glow = ctx.createRadialGradient(sx + 170, 86, 2, sx + 170, 86, 70);
    glow.addColorStop(0, 'rgba(255, 210, 120, 0.6)');
    glow.addColorStop(1, 'rgba(255, 210, 120, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sx + 100, 16, 140, 140);
    roundRectPath(ctx, sx + 161, 72, 18, 26, 4);
    fillAndOutline(ctx, '#ffd27a', 2);
  });
  ctx.fillStyle = '#3a2a3a';
  ctx.fillRect(0, 0, VIEW_WIDTH, 40);
  forEachTile(cameraX, 0.92, 60, (sx, i) => {
    ctx.beginPath();
    ctx.moveTo(sx, 40);
    ctx.quadraticCurveTo(sx + 30, 60, sx + 60, 40);
    ctx.strokeStyle = ['#e8862f', '#c8432d', '#f2c14e'][Math.abs(i) % 3];
    ctx.lineWidth = 4;
    ctx.stroke();
  });
  ctx.fillStyle = '#f1e8d6';
  ctx.fillRect(0, GROUND_Y - 72, VIEW_WIDTH, 10);
  forEachTile(cameraX, 0.92, 20, (sx) => {
    ctx.fillStyle = '#e6dac2';
    ctx.fillRect(sx + 6, GROUND_Y - 62, 8, 58);
  });
  ctx.strokeStyle = 'rgba(43, 26, 18, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-2, GROUND_Y - 72, VIEW_WIDTH + 4, 10);
  ctx.fillStyle = '#8a5a3c';
  ctx.fillRect(0, GROUND_Y, VIEW_WIDTH, VIEW_HEIGHT - GROUND_Y);
  forEachTile(cameraX, 1, 140, (sx, i) => {
    for (let row = 0; row < 4; row += 1) {
      ctx.fillStyle = (i + row) % 2 === 0 ? '#946446' : '#7d5236';
      ctx.fillRect(sx + (row % 2) * 70, GROUND_Y + 2 + row * 29, 139, 27);
    }
  });
  ctx.strokeStyle = 'rgba(43, 26, 18, 0.6)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 1);
  ctx.lineTo(VIEW_WIDTH, GROUND_Y + 1);
  ctx.stroke();
}

function paintWoods(ctx, cameraX, time) {
  paintDuskWoods(ctx, cameraX, time);
  forEachTile(cameraX, 0.7, 130, (sx, i) => {
    const n = hashNoise(i * 17);
    if (n > 0.4) paintRoundTree(ctx, sx + 60, GROUND_Y - 6, 60 + n * 30, [P.maple, P.amber, P.gold][Math.abs(i) % 3], P.woodDark, 'rgba(43, 26, 18, 0.6)');
  });
  ctx.fillStyle = '#5a6a32';
  ctx.fillRect(0, GROUND_Y - 6, VIEW_WIDTH, VIEW_HEIGHT - GROUND_Y + 6);
  ctx.fillStyle = '#9a7a4a';
  ctx.fillRect(0, GROUND_Y + 8, VIEW_WIDTH, 60);
}

const ZONES = [
  { startX: stageStartX(0), paint: paintFarmyard },
  { startX: stageStartX(1), paint: paintBarnInterior },
  { startX: stageStartX(2), paint: paintKitchen },
  { startX: stageStartX(3), paint: paintPorch },
  { startX: ROUTE_END_X, paint: paintWoods },
];

export function drawBackdrops(ctx, cameraX, time) {
  for (let i = 0; i < ZONES.length; i += 1) {
    const zoneStart = ZONES[i].startX - cameraX;
    const zoneEnd = i + 1 < ZONES.length ? ZONES[i + 1].startX - cameraX : Infinity;
    const left = Math.max(0, zoneStart);
    const right = Math.min(VIEW_WIDTH, zoneEnd);
    if (right <= left) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, 0, right - left, VIEW_HEIGHT);
    ctx.clip();
    ZONES[i].paint(ctx, cameraX, time);
    ctx.restore();
  }
}

// One stage's scene on its own, for the title and end screens.
export function drawSceneBackdrop(ctx, sceneId, cameraX, time) {
  const painters = { farmyard: paintFarmyard, barn: paintBarnInterior, kitchen: paintKitchen, porch: paintPorch, woods: paintWoods };
  (painters[sceneId] ?? paintFarmyard)(ctx, cameraX, time);
}
