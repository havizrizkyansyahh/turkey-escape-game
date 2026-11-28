// Plays Not On The Menu! headlessly with a simple bot over many seeds, to catch crashes and to
// see how far a decent player gets. It drives the game's own simulation modules (no DOM).
//
//   node tools/simulate-runs.ts [runs=40] [firstSeed=1] [bot=good|lazy]

import { createRun, updateRun, runSummary, farmerGap, hidingSpotUnderTurkey } from '../game/src/run.js';
import { STEP_SECONDS, GROUND_Y } from '../game/src/config.js';
import { lanternPosition, OVEN_TIMING, POT_TIMING } from '../game/src/hazards.js';
import { STAGES } from '../game/src/stages.js';

// The next few [start, end] windows (seconds from now) in which a cycling hazard hurts.
function dangerWindows(entity: any): Array<[number, number]> {
  const order = entity.kind === 'oven' ? ['idle', 'warn', 'blast'] : ['simmer', 'rattle', 'geyser'];
  const lengths: Record<string, number> = {
    idle: entity.idleSeconds,
    simmer: entity.idleSeconds,
    warn: OVEN_TIMING.warn,
    rattle: POT_TIMING.rattle,
    blast: OVEN_TIMING.blast,
    geyser: POT_TIMING.geyser,
  };
  const windows: Array<[number, number]> = [];
  let index = order.indexOf(entity.phase);
  let clock = 0;
  let left = entity.timer;
  for (let i = 0; i < 7; i += 1) {
    if (index === 2) windows.push([clock, clock + left]);
    clock += left;
    index = (index + 1) % 3;
    left = lengths[order[index]];
  }
  return windows;
}

// Picks a pace (slow, normal, fast) that keeps Tom out of the hazard's danger windows.
function safePace(entity: any, ahead: number, runSpeed: number): 'normal' | 'fast' | 'slow' | null {
  const inset = entity.kind === 'oven' ? OVEN_TIMING.flameInset : 8;
  const paces: Array<['normal' | 'fast' | 'slow', number]> = [
    ['normal', runSpeed],
    ['fast', runSpeed + 85],
    ['slow', runSpeed - 125],
  ];
  const windows = dangerWindows(entity);
  for (const [pace, speed] of paces) {
    const enter = (ahead + inset - 29) / speed;
    const leave = (ahead + entity.w - inset + 29) / speed;
    if (windows.every(([start, end]) => end < enter || start > leave)) return pace;
  }
  return null;
}

type Controls = {
  left: boolean;
  right: boolean;
  duck: boolean;
  jump: boolean;
  jumpPressed: boolean;
  dashPressed: boolean;
  hidePressed: boolean;
};

const JUMPABLE = new Set(['haybale', 'pumpkin', 'fence', 'pitchforks', 'pot', 'mud', 'chicken', 'rockingChair', 'baleStack']);
const DUCKABLE = new Set(['beam', 'table']);

function idle(): Controls {
  return { left: false, right: false, duck: false, jump: false, jumpPressed: false, dashPressed: false, hidePressed: false };
}

function goodBot(run: any, memory: { holdJump: number; hid: number }): Controls {
  const c = idle();
  const t = run.turkey;
  const f = run.farmer;
  if (memory.holdJump > 0) {
    memory.holdJump -= STEP_SECONDS;
    c.jump = true;
  }
  if (t.hiddenIn) {
    const searching = f.state === 'approach' || f.state === 'search' || f.state === 'pokeWindup';
    if (!searching || (f.state === 'search' && !f.lookingAtSpot)) c.hidePressed = true;
    return c;
  }
  // Cornered: read his arms. Up means a high swipe (duck under), low means a scoop (jump it).
  if (f.state === 'cornering' || f.state === 'swipe') {
    const ahead = f.x - t.x;
    if (ahead > -60 && ahead < 240) {
      if (f.ambushHigh) c.duck = t.onGround;
      else if (t.onGround && ahead > 90 && ahead < 175) {
        c.jumpPressed = true;
        c.jump = true;
        memory.holdJump = 0.3;
      }
      return c;
    }
  }
  const gap = farmerGap(run);
  const chasing = gap > 0 && !['shortcut', 'cornering', 'swipe', 'stunned', 'tumble'].includes(f.state);
  if (chasing && gap < 300 && t.onGround && hidingSpotUnderTurkey(run) && memory.hid < 4) {
    memory.hid += 1;
    c.hidePressed = true;
    return c;
  }
  if (chasing && gap < 175 && t.meter >= 34) c.dashPressed = true;

  for (const e of run.course.entities) {
    if (e.gone) continue;
    const ahead = e.x - t.x;
    if (e.kind === 'knife') {
      const behind = t.x - (e.x + e.w);
      if (behind < 260 && e.x < t.x + 30) {
        if (e.high) c.duck = true;
        else if (behind < 110 && t.onGround) {
          c.jumpPressed = true;
          c.jump = true;
        }
      }
      continue;
    }
    if (ahead > 480 || ahead + e.w < -40) continue;
    if (DUCKABLE.has(e.kind) && ahead < 110) c.duck = true;
    if (e.kind === 'lantern') {
      const at = lanternPosition(e);
      if (Math.abs(at.x - t.x) < 120 && at.y > GROUND_Y - 110) c.duck = true;
    }
    if ((e.kind === 'oven' || e.kind === 'pot') && ahead > 10) {
      const pace = safePace(e, ahead, STAGES[run.stageIndex].runSpeed);
      if (pace === 'fast' || pace === null) c.right = true;
      if (pace === 'slow') c.left = true;
      if (pace === null && e.kind === 'oven' && t.onGround && ahead + OVEN_TIMING.flameInset - 23 < t.vx * 0.22) {
        c.jumpPressed = true;
        c.jump = true;
        memory.holdJump = 0.5;
      }
    }
    if (e.kind === 'oven' && !t.onGround && !t.flutterUsed && t.vy > -60 && ahead < 60) c.jumpPressed = true;
    const centerAhead = ahead + e.w / 2;
    if (JUMPABLE.has(e.kind) && t.onGround && centerAhead > 0 && centerAhead < t.vx * 0.36) {
      c.jumpPressed = true;
      c.jump = true;
      memory.holdJump = e.kind === 'mud' || e.kind === 'fence' ? 0.4 : 0.3;
    }
    if (e.kind === 'rollingPin' && e.rolling && t.onGround && ahead < (t.vx + e.speed) * 0.3 && ahead > -20) {
      c.jumpPressed = true;
      memory.holdJump = 0.25;
    }
    if (e.kind === 'baleStack' && !t.onGround && !t.flutterUsed && t.vy > -80 && ahead < 120) c.jumpPressed = true;
  }
  if (c.jumpPressed || !t.onGround) c.duck = false;
  return c;
}

function lazyBot(): Controls {
  return idle();
}

const runs = Number(process.argv[2] ?? 40);
const firstSeed = Number(process.argv[3] ?? 1);
const botName = process.argv[4] ?? 'good';

const results: any[] = [];
const hurtCauses: Record<string, number> = {};
const setbacks: Record<string, number> = {};
let crashes = 0;
for (let seed = firstSeed; seed < firstSeed + runs; seed += 1) {
  const run = createRun(seed);
  const memory = { holdJump: 0, hid: 0 };
  let maxEntities = 0;
  try {
    for (let step = 0; step < 400 / STEP_SECONDS && !run.finished; step += 1) {
      const controls = botName === 'lazy' ? lazyBot() : goodBot(run, memory);
      updateRun(run, controls, STEP_SECONDS);
      maxEntities = Math.max(maxEntities, run.course.entities.length);
      for (const event of run.events) {
        if (event.type === 'hurt') hurtCauses[event.cause] = (hurtCauses[event.cause] ?? 0) + 1;
        if (['stumble', 'bonk', 'bawk', 'mud', 'spotted', 'farmerWindup', 'farmerMissed', 'cornered', 'slippedPast', 'hatHop', 'bowledOver'].includes(event.type)) {
          const key = event.kind ? `${event.type}:${event.kind}` : event.type;
          setbacks[key] = (setbacks[key] ?? 0) + 1;
          if (process.env.TRACE === String(seed) && event.type === 'stumble') {
            const t = run.turkey;
            console.log(`  t=${run.time.toFixed(2)} stumble on ${event.kind} turkey y=${t.y.toFixed(0)} vy=${t.vy.toFixed(0)} ground=${t.onGround} flutter=${t.flutterUsed}`);
          }
        }
      }
    }
  } catch (error) {
    crashes += 1;
    console.error(`seed ${seed} crashed at ${run.time.toFixed(2)}s:`, error);
    continue;
  }
  const summary = runSummary(run);
  results.push({ seed, ...summary, maxEntities, finished: run.finished });
}

const escaped = results.filter((r) => r.outcome === 'escaped').length;
const avgMeters = results.reduce((sum, r) => sum + r.meters, 0) / Math.max(1, results.length);
console.log(`bot=${botName} runs=${runs} crashes=${crashes} escaped=${escaped} avgMeters=${avgMeters.toFixed(0)}`);
for (const r of results.slice(0, 12)) {
  console.log(
    `seed ${String(r.seed).padStart(3)} ${r.outcome.padEnd(7)} ${String(r.meters).padStart(5)}m stage=${r.stageIndex} score=${r.score} hits=${r.hits} hides=${r.hides} sneaks=${r.sneaks} close=${r.closeCalls} corn=${r.corn} t=${r.seconds}s reason=${r.reason ?? '-'} ents=${r.maxEntities}`,
  );
}
const reasons: Record<string, number> = {};
for (const r of results) reasons[`${r.outcome}:${r.reason ?? '-'}@stage${r.stageIndex}`] = (reasons[`${r.outcome}:${r.reason ?? '-'}@stage${r.stageIndex}`] ?? 0) + 1;
console.log('outcomes:', reasons);
console.log('hurt causes:', hurtCauses);
console.log('setbacks:', setbacks);
