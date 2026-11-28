// Every tuning number of Not On The Menu! lives here, so balancing the chase is one file.

export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 600;
export const GROUND_Y = 486; // the line Tom's feet run on
export const PIXELS_PER_METER = 40;
export const STEP_SECONDS = 1 / 120; // fixed simulation step
export const GRAVITY = 2400;

export const ROUTE_METERS = 1600;
export const ROUTE_END_X = ROUTE_METERS * PIXELS_PER_METER;
export const COURSE_START_X = 1000; // a clear runway before the first obstacle

export const TURKEY_TUNING = {
  screenX: 370, // where the camera keeps Tom on screen
  startX: 420,
  width: 46,
  height: 58,
  duckHeight: 30,
  jumpSpeed: 790,
  jumpCut: 0.5,
  minJumpSeconds: 0.1,
  flutterLift: 340,
  flutterSeconds: 0.45,
  flutterGravity: 0.3,
  fastFallGravity: 1.9,
  acceleration: 1100,
  speedUpBonus: 85,
  slowDownPenalty: 125,
  dashBonus: 330,
  dashSeconds: 0.6,
  dashCost: 34,
  meterMax: 100,
  meterStart: 50,
  meterPerSecond: 2.8,
  cornMeter: 6,
  sneakBoostBonus: 230,
  sneakBoostSeconds: 1.5,
  hurtInvulnerable: 1.4,
  stumbleSeconds: 0.55,
  bumpSeconds: 0.25,
  bonkSeconds: 0.6,
  stumbleSpeedFactor: 0.3,
  mudSpeedFactor: 0.55,
  maxLives: 3,
};

export const FARMER_TUNING = {
  startGap: 640,
  comfortGap: 300, // beyond this the farmer speeds up to close in
  catchUpRange: 900,
  catchUpMax: 0.7,
  knockedOutFactor: 2.4,
  lungeTriggerGap: 150,
  lungeWindup: 0.42,
  spottedWindup: 0.3,
  lungeSeconds: 0.3,
  lungeSpeed: 980,
  recoverSeconds: 0.55,
  grabReach: 80,
  searchOffset: 96,
  pokeWindup: 0.7,
  pokeSeconds: 0.4,
  confusedSeconds: 2.1,
  aimSeconds: 0.8,
  knifeSpeedBonus: 430,
  throwMinGap: 240,
  throwMaxGap: 900,
};

export const AMBUSH_TUNING = {
  leadIn: 900, // when Tom is this far before the clearing, the farmer takes his shortcut
  clearing: 760, // the obstacle-free stretch of floor the ambush happens on
  popInset: 380, // where in the clearing the farmer pops out
  cancelWithin: 300, // too late to start once Tom is this close to the clearing
  shortcutMaxSeconds: 2.6,
  swipeReach: 118, // he swipes when Tom is this close
  swipeSeconds: 0.3,
  stunSeconds: 1.6, // after a hat hop or a gobble-dash into him
  tumbleSeconds: 1.1, // after Tom slips past
  hatHopBounce: 640,
  walkBackSpeed: 220, // toward a Tom with no feathers left
};

export const DECOY_TUNING = {
  start: 1, // corn decoys Tom starts each run with
  max: 3,
  cornPerDecoy: 25, // every 25 corn gobbled earns another
  distractSeconds: 1.5, // how long the farmer stops to sniff the cob
  lifeSeconds: 6, // an untouched cob is gone after this
};

export const SCORE_VALUES = {
  perMeter: 1,
  corn: 10,
  goldenCorn: 60,
  featherBonus: 100,
  closeCall: 25,
  hide: 50,
  sneak: 300,
  smash: 20,
  stageClear: 250,
  escape: 1000,
  perFeatherLeft: 250,
};
