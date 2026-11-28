// Corn decoys: Tom tosses a cob of sweet corn and Farmer Bramble can't help himself. Thrown behind
// Tom, it stops a chasing farmer for a moment; thrown at a farmer who has Tom cornered, he dives
// for it and the ambush is off. Every 25 corn gobbled earns another decoy, up to three.

import { GROUND_Y, GRAVITY, DECOY_TUNING as D } from './config.js';
import { addEntity } from './course.js';
import { sayLine } from './farmer.js';
import { abandonAmbush } from './ambush.js';
import { spawnPopup } from './particles.js';

export function throwDecoy(run) {
  const turkey = run.turkey;
  if (run.decoys <= 0) {
    spawnPopup(run.popups, { text: 'NO CORN DECOYS LEFT!', x: turkey.x, y: turkey.y - 112, color: '#fff6e5', size: 18 });
    run.events.push({ type: 'decoyEmpty' });
    return false;
  }
  run.decoys -= 1;
  run.stats.decoysUsed += 1;
  const forward = farmerBlocksTheLane(run.farmer);
  addEntity(run.course, 'decoy', turkey.x - 9, {
    w: 18,
    h: 26,
    y: turkey.y - 70,
    vx: forward ? turkey.vx + 230 : -240,
    vy: -430,
    landed: false,
    life: D.lifeSeconds,
    spin: 0,
  });
  run.events.push({ type: 'decoyThrown', forward });
  return true;
}

export function updateDecoys(run, dt) {
  for (const decoy of run.course.entities) {
    if (decoy.kind !== 'decoy' || decoy.gone) continue;
    flyDecoy(decoy, dt);
    decoy.life -= dt;
    if (decoy.life <= 0) decoy.gone = true;
    else lureFarmer(run, decoy);
  }
}

// Called as corn is gobbled: crossing each multiple of 25 earns a decoy. Returns how many.
export function earnDecoysForCorn(run, cornBefore, cornAfter) {
  const earned = Math.floor(cornAfter / D.cornPerDecoy) - Math.floor(cornBefore / D.cornPerDecoy);
  const before = run.decoys;
  if (earned > 0) run.decoys = Math.min(D.max, run.decoys + earned);
  return run.decoys - before;
}

function farmerBlocksTheLane(farmer) {
  return farmer.state === 'cornering' || farmer.state === 'swipe';
}

function flyDecoy(decoy, dt) {
  if (decoy.landed) return;
  decoy.vy += GRAVITY * dt;
  decoy.x += decoy.vx * dt;
  decoy.y += decoy.vy * dt;
  decoy.spin += dt * 14;
  if (decoy.y >= GROUND_Y - 8) {
    decoy.y = GROUND_Y - 8;
    decoy.landed = true;
    decoy.vx = 0;
    decoy.vy = 0;
  }
}

function lureFarmer(run, decoy) {
  const farmer = run.farmer;
  if (farmerBlocksTheLane(farmer)) {
    const low = decoy.landed || decoy.y > GROUND_Y - 150;
    if (low && Math.abs(decoy.x - farmer.x) < 160) {
      abandonAmbush(run);
      distractFarmer(run, decoy, 'Ooh! Sweet corn!', 80);
    }
    return;
  }
  if (farmer.state !== 'chase') return;
  // On the floor he trips over it; still in the air, a close farmer snatches it.
  const reach = decoy.x - farmer.x;
  const caught = decoy.landed ? reach > -30 && reach < 24 : Math.abs(reach) < 44 && decoy.y > GROUND_Y - 200;
  if (caught) distractFarmer(run, decoy, 'Is that... CORN?', 40);
}

function distractFarmer(run, decoy, line, points) {
  const farmer = run.farmer;
  decoy.gone = true;
  farmer.state = 'distracted';
  farmer.timer = D.distractSeconds;
  farmer.vx = 0;
  farmer.facing = decoy.x >= farmer.x ? 1 : -1;
  sayLine(farmer, line, 1.4);
  run.award(points, `DECOYED! +${points}`, run.turkey.x, GROUND_Y - 214, '#f6cd3f', 24);
  run.events.push({ type: 'decoyTaken' });
}
