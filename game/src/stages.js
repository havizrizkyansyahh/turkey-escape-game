// The route from the farmyard to freedom. Each stage runs faster, Farmer Bramble pushes harder,
// and its own obstacles come thicker as Tom gets closer to the next door.

import { PIXELS_PER_METER } from './config.js';

export const STAGES = [
  {
    id: 'farmyard',
    title: 'The Farmyard',
    tagline: 'Thanksgiving morning. Farmer Bramble is sharpening something.',
    startMeters: 0,
    endMeters: 380,
    runSpeed: 270,
    farmerSpeed: 254,
    spacingSeconds: [1.0, 1.55],
    hideKind: 'haystack',
    throwEvery: null,
    searchLook: [1.3, 1.1], // seconds looking at the hiding spot, then looking away
    searchLooks: [2, 3],
    patterns: { bales: 4, fence: 3, mud: 2, pumpkins: 3, chickens: 2, cornLine: 2, haystack: 2 },
    musicTempo: 124,
  },
  {
    id: 'barn',
    title: 'The Big Red Barn',
    tagline: 'Low beams, loose pitchforks, and nowhere to fly.',
    startMeters: 380,
    endMeters: 780,
    runSpeed: 292,
    farmerSpeed: 284,
    spacingSeconds: [0.9, 1.4],
    hideKind: 'barrel',
    throwEvery: [7, 10],
    searchLook: [1.2, 1.0],
    searchLooks: [2, 3],
    patterns: { bales: 3, baleStack: 2, beam: 3, pitchforks: 3, lantern: 2, barrel: 2, cornLine: 1 },
    musicTempo: 132,
  },
  {
    id: 'kitchen',
    title: "Grandma's Kitchen",
    tagline: 'The oven is preheated. The carving knife is out.',
    startMeters: 780,
    endMeters: 1380,
    runSpeed: 318,
    farmerSpeed: 313,
    spacingSeconds: [0.85, 1.3],
    hideKind: 'pantry',
    throwEvery: [4.5, 7.2],
    searchLook: [1.1, 0.9],
    searchLooks: [2, 3],
    patterns: { oven: 5, pot: 3, rollingPin: 3, table: 3, pantry: 2, cornLine: 1 },
    musicTempo: 140,
  },
  {
    id: 'porch',
    title: 'The Front Porch',
    tagline: 'The woods are right there. So is the farmer.',
    startMeters: 1380,
    endMeters: 1600,
    runSpeed: 338,
    farmerSpeed: 333,
    spacingSeconds: [0.85, 1.25],
    hideKind: null,
    throwEvery: [3.4, 5.2],
    searchLook: [1.0, 0.8],
    searchLooks: [2, 2],
    patterns: { pumpkins: 3, rollingPin: 2, rockingChair: 3, bales: 1, cornLine: 1 },
    musicTempo: 150,
  },
];

export function stageIndexAt(worldX) {
  const meters = worldX / PIXELS_PER_METER;
  for (let index = STAGES.length - 1; index >= 0; index -= 1) {
    if (meters >= STAGES[index].startMeters) return index;
  }
  return 0;
}

export function stageStartX(index) {
  return STAGES[index].startMeters * PIXELS_PER_METER;
}

export function stageEndX(index) {
  return STAGES[index].endMeters * PIXELS_PER_METER;
}
