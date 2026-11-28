// Farmer Bramble. He chases, speeds up when Tom gets away, lunges when he is close, throws carving
// knives from the barn on, and when Tom hides he searches the spot: looking at it, looking away,
// and finally poking it with his pitchfork.

import { GROUND_Y, FARMER_TUNING as F } from './config.js';
import { boxesOverlap } from './collisions.js';
import { clamp } from './numbers.js';
import { turkeyBox } from './turkey.js';
import { isAmbushState, updateAmbushFarmer } from './ambush.js';

const GRAB_LINES = ['GOTCHA!', "C'mere, drumstick!", 'Dinner time!', 'Hold STILL!'];
const CHASE_LINES = ['Get back here!', "You're the main course!", 'Grandma wants you basted!', 'Nobody skips Thanksgiving!'];
const SEARCH_LINES = ['Here, birdy birdy...', "I know you're in there...", 'Come on out, Tom...'];
const CONFUSED_LINES = ["Huh?! Where'd he go?", 'Was that... feathers?', 'Durn bird!'];
const KNIFE_LINES = ['Catch, drumstick!', 'Hold still for the carving!', 'Hyaah!'];

export function createFarmer(x) {
  return {
    x,
    y: GROUND_Y,
    vx: 0,
    state: 'chase',
    timer: 0,
    facing: 1,
    aimHigh: false,
    throwCooldown: 4,
    searchSpot: null,
    looksLeft: 0,
    lookingAtSpot: true,
    runPhase: 0,
    speech: null,
    speechLeft: 0,
    chatterCooldown: 5,
  };
}

export function farmerGrabBox(farmer) {
  return { x: farmer.x + 6, y: GROUND_Y - 124, w: F.grabReach, h: 124 };
}

function enter(farmer, state, seconds = 0) {
  farmer.state = state;
  farmer.timer = seconds;
}

export function sayLine(farmer, text, seconds = 1.6) {
  farmer.speech = text;
  farmer.speechLeft = seconds;
}

// The further behind he falls, the harder he runs: he never gives up on dinner.
export function farmerChaseSpeed(farmer, turkey, stage) {
  if (turkey.knockedOut) return stage.farmerSpeed * F.knockedOutFactor;
  const gap = turkey.x - farmer.x;
  const catchUp = clamp((gap - F.comfortGap) / F.catchUpRange, 0, F.catchUpMax);
  return stage.farmerSpeed * (1 + catchUp);
}

function chase(farmer, run, stage, speed, gap, dt) {
  const turkey = run.turkey;
  const random = run.random;
  farmer.facing = 1;
  farmer.vx = speed;
  if (turkey.hiddenIn) {
    farmer.searchSpot = turkey.hiddenIn;
    enter(farmer, 'approach');
    return;
  }
  if (turkey.caught || turkey.escaped) return;
  if (turkey.knockedOut) {
    if (gap < 70) run.onTurkeyCaught('knocked out');
    return;
  }
  if (gap < F.lungeTriggerGap && turkey.invulnerable <= 0) {
    enter(farmer, 'windup', F.lungeWindup);
    sayLine(farmer, random.pick(GRAB_LINES), 1.1);
    run.events.push({ type: 'farmerWindup' });
    return;
  }
  if (stage.throwEvery) {
    farmer.throwCooldown -= dt;
    if (farmer.throwCooldown <= 0 && gap > F.throwMinGap && gap < F.throwMaxGap) {
      if (!run.knifeLaneClear(gap)) {
        farmer.throwCooldown = 0.4; // wait until Tom is not busy with another obstacle
        return;
      }
      farmer.aimHigh = random.chance(0.5);
      enter(farmer, 'aim', F.aimSeconds);
      sayLine(farmer, random.pick(KNIFE_LINES), 1.0);
      run.events.push({ type: 'farmerAim', high: farmer.aimHigh });
      return;
    }
  }
  farmer.chatterCooldown -= dt;
  if (farmer.chatterCooldown <= 0 && gap < 700) {
    sayLine(farmer, random.pick(CHASE_LINES), 1.8);
    farmer.chatterCooldown = random.range(7, 12);
  }
}

function approachSpot(farmer, run, stage, speed, dt) {
  const turkey = run.turkey;
  const random = run.random;
  const spot = farmer.searchSpot;
  farmer.facing = 1;
  if (!turkey.hiddenIn || !spot) {
    enter(farmer, 'chase');
    return;
  }
  const standX = spot.x + spot.w / 2 - F.searchOffset;
  const direction = farmer.x <= standX ? 1 : -1; // from behind, or walking back from an ambush
  farmer.facing = direction;
  farmer.vx = speed * direction;
  const next = farmer.x + farmer.vx * dt;
  if (direction > 0 ? next >= standX : next <= standX) {
    farmer.x = standX;
    farmer.vx = 0;
    farmer.looksLeft = random.int(stage.searchLooks[0], stage.searchLooks[1]);
    farmer.lookingAtSpot = true;
    enter(farmer, 'search', stage.searchLook[0] * random.range(0.85, 1.15));
    sayLine(farmer, random.pick(SEARCH_LINES), 2.2);
    run.events.push({ type: 'farmerSearch' });
  }
}

function searchSpot(farmer, run, stage) {
  const random = run.random;
  farmer.vx = 0;
  if (farmer.timer <= 0) {
    if (farmer.lookingAtSpot) {
      farmer.lookingAtSpot = false;
      farmer.timer = stage.searchLook[1] * random.range(0.85, 1.15);
      run.events.push({ type: 'farmerLooksAway' });
    } else {
      farmer.looksLeft -= 1;
      farmer.lookingAtSpot = true;
      if (farmer.looksLeft <= 0) {
        enter(farmer, 'pokeWindup', F.pokeWindup);
        sayLine(farmer, "Gotcha in there, don't I!", 1.3);
        run.events.push({ type: 'farmerPokeWindup' });
      } else {
        farmer.timer = stage.searchLook[0] * random.range(0.85, 1.15);
        run.events.push({ type: 'farmerLooksBack' });
      }
    }
  }
  farmer.facing = farmer.lookingAtSpot ? 1 : -1;
}

export function updateFarmer(farmer, run, stage, dt) {
  const turkey = run.turkey;
  const gap = turkey.x - farmer.x;
  const speed = farmerChaseSpeed(farmer, turkey, stage);
  farmer.timer -= dt;
  farmer.speechLeft = Math.max(0, farmer.speechLeft - dt);

  switch (farmer.state) {
    case 'chase':
      chase(farmer, run, stage, speed, gap, dt);
      break;
    case 'windup':
      farmer.vx = speed * 0.55;
      if (farmer.timer <= 0) enter(farmer, 'lunge', F.lungeSeconds);
      break;
    case 'lunge': {
      farmer.vx = F.lungeSpeed;
      const grabbable = !turkey.hiddenIn && turkey.invulnerable <= 0 && !turkey.caught;
      if (grabbable && boxesOverlap(farmerGrabBox(farmer), turkeyBox(turkey))) {
        run.onTurkeyCaught('grabbed');
        break;
      }
      if (farmer.timer <= 0 || gap < 30) {
        enter(farmer, 'recover', F.recoverSeconds);
        run.events.push({ type: 'farmerMissed' });
      }
      break;
    }
    case 'recover':
      farmer.vx = speed * 0.45;
      if (farmer.timer <= 0) enter(farmer, 'chase');
      break;
    case 'aim':
      farmer.vx = speed * 0.85;
      if (farmer.timer <= 0) {
        run.spawnKnife(farmer.x + 40, farmer.aimHigh);
        farmer.throwCooldown = run.random.range(stage.throwEvery[0], stage.throwEvery[1]);
        enter(farmer, 'chase');
      }
      break;
    case 'approach':
      approachSpot(farmer, run, stage, speed, dt);
      break;
    case 'search':
      searchSpot(farmer, run, stage);
      break;
    case 'pokeWindup':
      farmer.vx = 0;
      farmer.facing = 1;
      if (farmer.timer <= 0) {
        enter(farmer, 'poke', F.pokeSeconds);
        run.onSpotPoked(farmer.searchSpot);
      }
      break;
    case 'poke':
      farmer.vx = 0;
      if (farmer.timer <= 0) enter(farmer, 'chase');
      break;
    case 'confused':
      farmer.vx = 0;
      farmer.facing = -1;
      if (farmer.timer <= 0) {
        enter(farmer, 'chase');
        sayLine(farmer, 'Hey! Get back here!', 1.4);
      }
      break;
    case 'celebrate':
      farmer.vx = 0;
      farmer.facing = 1;
      break;
    case 'defeated':
      farmer.vx = Math.max(0, farmer.vx - 700 * dt);
      farmer.facing = 1;
      break;
    default:
      if (isAmbushState(farmer.state)) updateAmbushFarmer(farmer, run, stage, dt);
      else enter(farmer, 'chase');
  }

  // He may close in, but never runs through Tom while chasing.
  const chasing = farmer.state === 'chase' || farmer.state === 'windup' || farmer.state === 'recover' || farmer.state === 'aim';
  if (chasing && gap < 70 && !turkey.knockedOut) farmer.vx = Math.min(farmer.vx, Math.max(0, turkey.vx - 10));

  farmer.x += farmer.vx * dt;
  farmer.runPhase += dt * (2 + Math.abs(farmer.vx) / 38);
}

// Tom slipped out behind his back.
export function startleFarmer(farmer, run) {
  enter(farmer, 'confused', F.confusedSeconds);
  sayLine(farmer, run.random.pick(CONFUSED_LINES), 1.8);
}

// Tom came out while the farmer was looking right at the spot.
export function spotTurkey(farmer) {
  enter(farmer, 'windup', F.spottedWindup);
  sayLine(farmer, 'THERE you are!', 1.2);
}

export function farmerGivesUp(farmer) {
  enter(farmer, 'defeated');
  sayLine(farmer, 'Durn it! ...Ham this year, then.', 3.2);
}

export function farmerCelebrates(farmer) {
  enter(farmer, 'celebrate');
  sayLine(farmer, "Dinner's served!", 3);
}
