// Lays the route out ahead of Tom from hand-made obstacle patterns, picked per stage with a seeded
// random generator and spaced so every obstacle can be read and answered in time. Corn is placed
// along the arc of a jump, so following the corn teaches the timing.

import { COURSE_START_X, GROUND_Y, ROUTE_END_X } from './config.js';
import { STAGES, stageIndexAt, stageStartX, stageEndX } from './stages.js';
import { HIDING_SPOTS } from './hazards.js';

const GATE_CLEARANCE = 340; // empty floor after each stage door
const PATTERN_RESERVE = 460; // room a pattern may need before the next stage door
const PATTERN_LEAD = { rollingPin: 320 }; // extra room in front: the pin rolls toward Tom

export function createCourse(random) {
  return {
    random,
    entities: [],
    nextX: COURSE_START_X,
    nextId: 1,
    lastPattern: null,
    repeats: 0,
    gatesPlaced: new Set(),
    feathersPlaced: new Set(),
    finishPlaced: false,
  };
}

export function addEntity(course, kind, x, props = {}) {
  const entity = {
    id: course.nextId++,
    kind,
    x,
    y: GROUND_Y,
    w: 40,
    h: 40,
    hit: false,
    gone: false,
    used: false,
    occupied: false,
    nearMiss: false,
    scored: false,
    phase: null,
    timer: 0,
    ...props,
  };
  course.entities.push(entity);
  return entity;
}

// Corn along a jump's arc: feet height follows the jump's parabola around the obstacle's centre.
function cornArc(course, centerX, peakFeetHeight, count) {
  for (let i = 0; i < count; i += 1) {
    const dx = (i - (count - 1) / 2) * 32;
    const feet = Math.max(0, peakFeetHeight - (dx * dx) / 75);
    addEntity(course, 'corn', centerX + dx - 9, { w: 18, h: 26, y: GROUND_Y - feet - 30 });
  }
}

function cornRow(course, startX, count, feetHeight = 0) {
  for (let i = 0; i < count; i += 1) {
    addEntity(course, 'corn', startX + i * 34, { w: 18, h: 26, y: GROUND_Y - feetHeight - 30 });
  }
  return count * 34;
}

const PATTERNS = {
  bales(course, x, random) {
    const count = random.chance(0.35) ? 2 : 1;
    let cursor = x;
    for (let i = 0; i < count; i += 1) {
      addEntity(course, 'haybale', cursor, { w: 74, h: 54 });
      cornArc(course, cursor + 37, 112, 3);
      cursor += 74;
      if (i < count - 1) cursor += random.range(240, 300);
    }
    return cursor - x;
  },
  baleStack(course, x) {
    addEntity(course, 'baleStack', x, { w: 74, h: 104 });
    addEntity(course, 'goldenCorn', x + 24, { w: 26, h: 34, y: GROUND_Y - 200 });
    return 74;
  },
  fence(course, x, random) {
    addEntity(course, 'fence', x, { w: 78, h: 62, sign: random.chance(0.45) });
    cornArc(course, x + 39, 122, 4);
    return 78;
  },
  mud(course, x) {
    addEntity(course, 'mud', x, { w: 170, h: 8 });
    cornArc(course, x + 85, 92, 5);
    return 170;
  },
  pumpkins(course, x, random) {
    const count = random.int(1, 3);
    let cursor = x;
    for (let i = 0; i < count; i += 1) {
      addEntity(course, 'pumpkin', cursor, { w: 50, h: 44, look: random.int(0, 2) });
      cursor += 50;
      if (i < count - 1) cursor += random.range(190, 250);
    }
    return cursor - x;
  },
  chickens(course, x, random) {
    cornRow(course, x - 90, 3);
    addEntity(course, 'chicken', x, { w: 36, h: 36, wander: random.range(0, 6), look: 0 });
    addEntity(course, 'chicken', x + random.range(120, 170), { w: 36, h: 36, wander: random.range(0, 6), look: 1 });
    return 210;
  },
  cornLine(course, x, random) {
    const count = random.int(5, 8);
    const width = cornRow(course, x, count, random.chance(0.3) ? 64 : 0);
    if (random.chance(0.15)) addEntity(course, 'goldenCorn', x + width + 10, { w: 26, h: 34, y: GROUND_Y - 44 });
    return width + 40;
  },
  haystack(course, x) {
    cornRow(course, x - 150, 3);
    addEntity(course, 'haystack', x, { w: 136, h: 118 });
    return 136 + 280;
  },
  barrel(course, x) {
    cornRow(course, x - 150, 3);
    addEntity(course, 'barrel', x, { w: 82, h: 98 });
    return 82 + 280;
  },
  pantry(course, x) {
    cornRow(course, x - 150, 3);
    addEntity(course, 'pantry', x, { w: 110, h: 178 });
    return 110 + 280;
  },
  beam(course, x) {
    addEntity(course, 'beam', x, { w: 120, h: 30, clearance: 40 });
    cornRow(course, x + 12, 3, -14);
    return 120;
  },
  pitchforks(course, x, random) {
    const count = random.chance(0.4) ? 2 : 1;
    let cursor = x;
    for (let i = 0; i < count; i += 1) {
      addEntity(course, 'pitchforks', cursor, { w: 66, h: 36 });
      cornArc(course, cursor + 33, 116, 3);
      cursor += 66;
      if (i < count - 1) cursor += random.range(250, 310);
    }
    return cursor - x;
  },
  lantern(course, x, random) {
    addEntity(course, 'lantern', x, { w: 60, h: 40, rope: 238, swing: 0, phaseOffset: random.range(0, Math.PI * 2) });
    return 60 + 140;
  },
  oven(course, x, random) {
    addEntity(course, 'oven', x, {
      w: 150,
      h: 152,
      phase: 'idle',
      timer: random.range(0.3, 2.4),
      idleSeconds: random.range(1.7, 2.5),
      flameHeight: 60,
    });
    return 150;
  },
  pot(course, x, random) {
    addEntity(course, 'pot', x, { w: 66, h: 50, phase: 'simmer', timer: random.range(0.4, 2.2), idleSeconds: random.range(1.6, 2.4) });
    cornArc(course, x + 33, 118, 3);
    return 66;
  },
  rollingPin(course, x, random) {
    addEntity(course, 'rollingPin', x + 260, { w: 72, h: 24, rolling: false, angle: 0, speed: random.range(170, 230) });
    return 300;
  },
  table(course, x) {
    addEntity(course, 'table', x, { w: 156, h: 88, clearance: 40 });
    cornRow(course, x + 22, 4, -14);
    return 156;
  },
  rockingChair(course, x, random) {
    addEntity(course, 'rockingChair', x, { w: 72, h: 66, rock: random.range(0, 6) });
    cornArc(course, x + 36, 122, 3);
    return 72;
  },
};

function pickPattern(course, stage) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const kind = course.random.weighted(stage.patterns);
    const repeat = kind === course.lastPattern;
    if (repeat && (course.repeats >= 1 || HIDING_SPOTS.has(kind))) continue;
    course.repeats = repeat ? course.repeats + 1 : 0;
    course.lastPattern = kind;
    return kind;
  }
  course.lastPattern = 'cornLine';
  course.repeats = 0;
  return 'cornLine';
}

function placeGate(course, stageIndex) {
  const doorX = stageStartX(stageIndex);
  addEntity(course, 'gate', doorX - 70, { w: 140, h: 320, stageIndex });
  course.gatesPlaced.add(stageIndex);
  course.nextX = Math.max(course.nextX, doorX + GATE_CLEARANCE);
}

// One spare tail feather floats high above the middle of each stage: it takes a flutter to reach.
function maybePlaceFeather(course, stageIndex, x) {
  if (course.feathersPlaced.has(stageIndex)) return;
  const start = stageStartX(stageIndex);
  const progress = (x - start) / (stageEndX(stageIndex) - start);
  if (progress < 0.45) return;
  course.feathersPlaced.add(stageIndex);
  addEntity(course, 'featherPickup', x - 120, { w: 30, h: 38, y: GROUND_Y - 205 });
}

export function extendCourse(course, untilX) {
  const random = course.random;
  while (course.nextX < untilX && course.nextX < ROUTE_END_X - 420) {
    const stageIndex = stageIndexAt(course.nextX);
    if (stageIndex > 0 && !course.gatesPlaced.has(stageIndex)) {
      placeGate(course, stageIndex);
      continue;
    }
    const stage = STAGES[stageIndex];
    const nextDoorX = stageIndex + 1 < STAGES.length ? stageStartX(stageIndex + 1) : ROUTE_END_X;
    const kind = pickPattern(course, stage);
    const startX = course.nextX + (PATTERN_LEAD[kind] ?? 0);
    if (startX + PATTERN_RESERVE > nextDoorX - 240) {
      course.nextX = nextDoorX;
      continue;
    }
    const width = PATTERNS[kind](course, startX, random, stage);
    maybePlaceFeather(course, stageIndex, startX);
    const start = stageStartX(stageIndex);
    const progress = Math.min(1, Math.max(0, (startX - start) / (stageEndX(stageIndex) - start)));
    const squeeze = 1.12 - 0.24 * progress; // obstacles come thicker toward each stage's end
    const spacing = stage.runSpeed * random.range(stage.spacingSeconds[0], stage.spacingSeconds[1]) * squeeze;
    course.nextX = startX + width + Math.max(160, spacing);
  }
  if (!course.finishPlaced && untilX > ROUTE_END_X - 1400) {
    addEntity(course, 'finishGate', ROUTE_END_X - 60, { w: 220, h: 330 });
    course.finishPlaced = true;
  }
}

// Holds back the next `length` px of floor for a set piece (the farmer's ambush): nothing is
// placed there. Refused when the stretch would reach a stage door or the finish, or sit on a gate.
export function reserveClearing(course, length) {
  const startX = course.nextX + 60;
  const stageIndex = stageIndexAt(startX);
  const nextDoorX = stageIndex + 1 < STAGES.length ? stageStartX(stageIndex + 1) : ROUTE_END_X;
  if (!Number.isFinite(startX) || startX + length > nextDoorX - 240) return null;
  if (startX < stageStartX(stageIndex) + GATE_CLEARANCE) return null;
  course.nextX = startX + length + 60;
  return startX;
}

export function pruneCourse(course, beforeX) {
  let keep = 0;
  for (const entity of course.entities) {
    const behind = entity.x + entity.w < beforeX && entity.kind !== 'knife';
    if (!behind && !entity.gone) course.entities[keep++] = entity;
  }
  course.entities.length = keep;
}

export function isHidingSpot(entity) {
  return HIDING_SPOTS.has(entity.kind);
}
