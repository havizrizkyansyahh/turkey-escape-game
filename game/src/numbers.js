// Small number helpers shared by the simulation and the drawing code.

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

// Moves value toward target by at most maxStep, never past it.
export function approach(value, target, maxStep) {
  if (value < target) return Math.min(target, value + maxStep);
  return Math.max(target, value - maxStep);
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// A 0→1→0 pulse, handy for blinking warnings.
export function pulse(time, rate) {
  return 0.5 + 0.5 * Math.sin(time * rate);
}
