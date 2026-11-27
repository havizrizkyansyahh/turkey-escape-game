// Drawing the short-lived effects: particles, floating score words and hints, the farmer's speech
// bubble, and the "!" or "?" over his head that warns what he will do next.

import { GROUND_Y, VIEW_WIDTH } from '../config.js';
import { PALETTE as P, INK } from './palette.js';
import { ellipsePath, roundRectPath, fillAndOutline, chunkyText, star, textWidth, BODY_FONT } from './brush.js';

export function drawParticles(ctx, particles, cameraX) {
  for (const p of particles) {
    const x = p.x - cameraX;
    if (x < -40 || x > VIEW_WIDTH + 40) continue;
    const fade = Math.min(1, p.life / (p.maxLife * 0.5));
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(x, p.y);
    ctx.rotate(p.angle);
    switch (p.kind) {
      case 'feather':
        ellipsePath(ctx, 0, 0, p.size * 1.3, p.size * 0.45);
        fillAndOutline(ctx, p.color, 1.2);
        break;
      case 'leaf':
        star(ctx, 0, 0, p.size, p.size * 0.5, 5);
        ctx.fillStyle = p.color;
        ctx.fill();
        break;
      case 'straw':
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(p.size, 0);
        ctx.stroke();
        break;
      case 'spark':
        star(ctx, 0, 0, p.size, p.size * 0.4, 4);
        ctx.fillStyle = p.color;
        ctx.fill();
        break;
      case 'star':
        star(ctx, 0, 0, p.size, p.size * 0.45, 5);
        fillAndOutline(ctx, p.color, 1.2);
        break;
      case 'mud':
      case 'chunk':
        ellipsePath(ctx, 0, 0, p.size, p.size * 0.75);
        fillAndOutline(ctx, p.color, 1.2);
        break;
      default: {
        const swell = p.size * (1.7 - fade * 0.7);
        ctx.globalAlpha = fade * 0.55;
        ellipsePath(ctx, 0, 0, swell, swell);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

export function drawPopups(ctx, popups, cameraX) {
  for (const popup of popups) {
    const age = Math.max(0, popup.maxLife - popup.life);
    const grow = Math.min(1, age / 0.12);
    const fade = Math.max(0, Math.min(1, popup.life / 0.35));
    const x = popup.x - cameraX;
    const size = Math.max(4, popup.size * (0.6 + 0.4 * grow));
    if (popup.hint) {
      const width = textWidth(ctx, popup.text, size) + 28;
      ctx.save();
      ctx.globalAlpha = fade * 0.85;
      roundRectPath(ctx, x - width / 2, popup.y - size * 0.95, width, size * 1.9, size * 0.9);
      ctx.fillStyle = 'rgba(43, 26, 18, 0.82)';
      ctx.fill();
      ctx.restore();
    }
    chunkyText(ctx, popup.text, x, popup.y, { size, fill: popup.color, alpha: fade, shadow: !popup.hint });
  }
}

export function drawSpeechBubble(ctx, text, x, y, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `700 15px ${BODY_FONT}`;
  const width = ctx.measureText(text).width + 24;
  const height = 30;
  const left = Math.max(8, Math.min(VIEW_WIDTH - width - 8, x - width / 2));
  const top = y - height;
  const tailX = Math.max(left + 14, Math.min(left + width - 14, x));
  roundRectPath(ctx, left, top, width, height, 12);
  fillAndOutline(ctx, '#fffaf0', 2.5);
  ctx.beginPath();
  ctx.moveTo(tailX - 8, top + height - 2);
  ctx.lineTo(tailX, top + height + 12);
  ctx.lineTo(tailX + 7, top + height - 2);
  ctx.closePath();
  ctx.fillStyle = '#fffaf0';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(tailX - 8, top + height);
  ctx.lineTo(tailX, top + height + 12);
  ctx.lineTo(tailX + 7, top + height);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, left + 12, top + height / 2 + 1);
  ctx.restore();
}

export function drawFarmerAlert(ctx, farmer, screenX, time) {
  let symbol = null;
  let color = P.uiRed;
  if (farmer.state === 'windup' || farmer.state === 'aim' || farmer.state === 'pokeWindup') symbol = '!';
  else if (farmer.state === 'search' && farmer.lookingAtSpot) {
    symbol = '?';
    color = P.uiGold;
  } else if (farmer.state === 'confused') {
    symbol = '?';
    color = '#a8d8ff';
  }
  if (!symbol) return;
  const bounce = Math.abs(Math.sin(time * 9)) * 5;
  chunkyText(ctx, symbol, screenX + farmer.facing * 34, GROUND_Y - 206 - bounce, { size: 34, fill: color, outline: 6 });
}
