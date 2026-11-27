// Drawing helpers every painter shares: outlined shapes, outlined limbs, soft ground shadows,
// panels, and the chunky outlined lettering used for titles, pop-ups and the HUD.

import { INK } from './palette.js';

export const DISPLAY_FONT = '"Arial Black", "Arial Bold", Gadget, Impact, sans-serif';
export const BODY_FONT = '"Trebuchet MS", "Segoe UI", Verdana, Arial, sans-serif';

export function ellipsePath(ctx, x, y, rx, ry, rotation = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rotation, 0, Math.PI * 2);
}

export function roundRectPath(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

export function fillAndOutline(ctx, fill, lineWidth = 3, stroke = INK) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth > 0) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

// A thick rounded stroke with an ink outline: arms, legs, handles.
export function limb(ctx, points, width, color, outline = 3) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  if (outline > 0) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = width + outline * 2;
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

export function groundShadow(ctx, x, y, radius, alpha = 0.24) {
  ctx.save();
  ctx.fillStyle = `rgba(43, 22, 10, ${alpha})`;
  ellipsePath(ctx, x, y, radius, radius * 0.2);
  ctx.fill();
  ctx.restore();
}

export function chunkyText(ctx, text, x, y, options = {}) {
  const {
    size = 24,
    fill = '#fff6e5',
    stroke = INK,
    align = 'center',
    baseline = 'middle',
    font = DISPLAY_FONT,
    outline = Math.max(3, size * 0.2),
    shadow = true,
    alpha = 1,
  } = options;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `900 ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.lineJoin = 'round';
  if (shadow) {
    ctx.fillStyle = 'rgba(43, 26, 18, 0.5)';
    ctx.strokeStyle = 'rgba(43, 26, 18, 0.5)';
    ctx.lineWidth = outline;
    ctx.strokeText(text, x + size * 0.05, y + size * 0.1);
    ctx.fillText(text, x + size * 0.05, y + size * 0.1);
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = outline;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function plainText(ctx, text, x, y, options = {}) {
  const { size = 16, color = '#fff6e5', align = 'left', baseline = 'middle', font = BODY_FONT, weight = '700', alpha = 1 } = options;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function textWidth(ctx, text, size, font = DISPLAY_FONT, weight = '900') {
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
}

export function panel(ctx, x, y, w, h, options = {}) {
  const { radius = 14, fill = 'rgba(43, 26, 18, 0.9)', edge = 'rgba(242, 193, 78, 0.85)', edgeWidth = 2.5 } = options;
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (edgeWidth > 0) {
    ctx.lineWidth = edgeWidth;
    ctx.strokeStyle = edge;
    ctx.stroke();
  }
}

export function star(ctx, x, y, outer, inner, points = 5, rotation = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = rotation + (i * Math.PI) / points;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
