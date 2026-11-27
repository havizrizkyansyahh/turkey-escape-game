// Axis-aligned boxes { x, y, w, h }, with y growing downward like the canvas.

export function boxesOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function growBox(box, margin) {
  return { x: box.x - margin, y: box.y - margin, w: box.w + margin * 2, h: box.h + margin * 2 };
}

export function hitbox(effect, x, y, w, h) {
  return { effect, x, y, w, h };
}
