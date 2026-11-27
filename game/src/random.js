// Seeded random numbers (mulberry32): the same seed always builds the same course, which keeps
// screenshots and simulations repeatable.

export function createRandom(seed) {
  let state = seed >>> 0 || 0x9e3779b9;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    chance: (probability) => next() < probability,
    pick: (list) => list[Math.floor(next() * list.length)],
    // weights: { key: relativeWeight } → one key
    weighted(weights) {
      const entries = Object.entries(weights);
      let total = 0;
      for (const [, weight] of entries) total += weight;
      let roll = next() * total;
      for (const [key, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return key;
      }
      return entries[entries.length - 1][0];
    },
  };
}

// A stable 0..1 value for an integer, used to place scenery without storing it.
export function hashNoise(n) {
  let t = (Math.imul(n | 0, 374761393) + 668265263) >>> 0;
  t = Math.imul(t ^ (t >>> 13), 1274126177) >>> 0;
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}
