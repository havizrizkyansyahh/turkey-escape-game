// The app around a run: the title screen, playing, paused and the end screen, the buttons on each,
// best scores kept between visits, and which sound each moment of the chase makes.

import { createRun, updateRun, runSummary, dangerLevel } from './run.js';
import { drawRunScene } from './render.js';
import { drawHud, PAUSE_BUTTON } from './ui/hud.js';
import { drawTitleScreen, drawPauseOverlay, drawEndScreen, titleButtons, pauseButtons, endButtons, buttonAt } from './ui/screens.js';
import { loadBest, saveBest, emptyBest } from './storage.js';
import { medalsEarned, mergeMedals } from './medals.js';

export function createGame({ seed, audio = null, shotMode = false }) {
  return {
    screen: 'title',
    seed: seed >>> 0,
    run: null,
    audio,
    shotMode,
    time: 0,
    showHelp: false,
    showKeys: true, // the controls strip along the bottom of the play screen (H toggles it)
    muted: audio ? audio.isMuted() : false,
    best: shotMode ? emptyBest() : loadBest(),
    summary: null,
    heartbeatLeft: 0,
    pointer: { x: -1, y: -1 },
  };
}

function sound(game, name) {
  if (name) game.audio?.play(name);
}

function nextSeed(game) {
  game.seed = (Math.imul(game.seed ^ 0x9e3779b9, 2654435761) + 1013904223) >>> 0;
  return game.seed;
}

export function startRun(game) {
  game.run = createRun(nextSeed(game));
  game.screen = 'playing';
  game.showHelp = false;
  game.audio?.startMusic(0);
  sound(game, 'start');
}

function finishRun(game) {
  const summary = runSummary(game.run);
  const best = { ...game.best };
  summary.newBest = summary.score > best.score;
  if (summary.newBest) best.score = summary.score;
  best.meters = Math.max(best.meters, summary.meters);
  if (summary.outcome === 'escaped') best.escapes += 1;
  summary.medals = medalsEarned(summary);
  const { owned, fresh } = mergeMedals(best.medals ?? [], summary.medals);
  best.medals = owned;
  summary.newMedals = fresh;
  game.best = best;
  if (!game.shotMode) saveBest(best);
  game.summary = summary;
  game.screen = 'ended';
  game.time = 0;
}

function toggleMute(game) {
  if (game.audio) game.muted = game.audio.toggleMute();
}

function updateTitle(game, input) {
  const clicked = input.click ? buttonAt(titleButtons(game), input.click) : null;
  if (clicked === 'sound') {
    toggleMute(game);
    sound(game, 'click');
    return;
  }
  if (input.helpPressed || clicked === 'help') {
    game.showHelp = !game.showHelp;
    sound(game, 'click');
    return;
  }
  if (game.showHelp && (input.backPressed || (input.click && !clicked))) {
    game.showHelp = false;
    return;
  }
  if (input.confirmPressed || clicked === 'start') startRun(game);
}

function playEvent(game, event) {
  if (event.type === 'stage') game.audio?.startMusic(event.index);
  if (event.type === 'escaped' || event.type === 'caught') game.audio?.stopMusic();
  sound(game, EVENT_SOUNDS[event.type]);
}

function updatePlaying(game, input, dt) {
  const run = game.run;
  const pauseClicked = input.click && buttonAt([PAUSE_BUTTON], input.click);
  if (!run.outcome && (input.pausePressed || pauseClicked)) {
    game.screen = 'paused';
    game.audio?.pauseMusic();
    sound(game, 'click');
    return;
  }
  if (input.helpPressed) game.showKeys = !game.showKeys;
  // a left click in play is a jump (and a second click mid-air is the flutter)
  const controls = input.click ? { ...input, jumpPressed: true, jump: true } : input;
  updateRun(run, controls, dt);
  for (const event of run.events) playEvent(game, event);

  const danger = dangerLevel(run);
  game.audio?.setIntensity(danger);
  game.heartbeatLeft -= dt;
  if (danger > 0.45 && game.heartbeatLeft <= 0) {
    sound(game, 'heartbeat');
    game.heartbeatLeft = 0.75 - danger * 0.3;
  }
  if (run.finished) finishRun(game);
}

function updatePaused(game, input) {
  const clicked = input.click ? buttonAt(pauseButtons(), input.click) : null;
  if (clicked === 'resume' || input.pausePressed || input.confirmPressed) {
    game.screen = 'playing';
    game.audio?.resumeMusic();
    return;
  }
  if (clicked === 'restart' || input.restartPressed) {
    startRun(game);
    return;
  }
  if (clicked === 'quit') {
    game.screen = 'title';
    game.audio?.stopMusic();
  }
}

function updateEnded(game, input) {
  if (game.time < 0.6) return; // a late key press from the chase should not skip this screen
  const clicked = input.click ? buttonAt(endButtons(), input.click) : null;
  if (input.confirmPressed || input.restartPressed || clicked === 'again') {
    startRun(game);
    return;
  }
  if (input.backPressed || clicked === 'title') {
    game.screen = 'title';
    game.time = 0;
  }
}

export function updateGame(game, input, dt) {
  game.time += dt;
  if (input.pointer) game.pointer = input.pointer;
  if (input.mutePressed) toggleMute(game);
  switch (game.screen) {
    case 'title':
      updateTitle(game, input);
      break;
    case 'playing':
      updatePlaying(game, input, dt);
      break;
    case 'paused':
      updatePaused(game, input);
      break;
    case 'ended':
      updateEnded(game, input);
      break;
    default:
      game.screen = 'title';
  }
}

export function drawGame(ctx, game) {
  switch (game.screen) {
    case 'playing':
      drawRunScene(ctx, game.run);
      drawHud(ctx, game.run, game);
      break;
    case 'paused':
      drawRunScene(ctx, game.run);
      drawHud(ctx, game.run, game);
      drawPauseOverlay(ctx, game);
      break;
    case 'ended':
      drawEndScreen(ctx, game);
      break;
    default:
      drawTitleScreen(ctx, game);
  }
}

const EVENT_SOUNDS = {
  jump: 'jump',
  flutter: 'flutter',
  dash: 'dash',
  dashEmpty: 'dashEmpty',
  corn: 'corn',
  golden: 'golden',
  feather: 'feather',
  stumble: 'stumble',
  bonk: 'bonk',
  bawk: 'bawk',
  mud: 'mud',
  smash: 'smash',
  hurt: 'hurt',
  hide: 'hide',
  unhide: 'unhide',
  sneak: 'sneak',
  spotted: 'spotted',
  poke: 'poke',
  closeCall: 'closeCall',
  stage: 'stage',
  escaped: 'escaped',
  caught: 'caught',
  ovenWarn: 'ovenWarn',
  ovenBlast: 'ovenBlast',
  geyser: 'geyser',
  knifeThrown: 'knifeThrow',
  farmerWindup: 'farmerWindup',
  farmerAim: 'warn',
  farmerMissed: 'whoosh',
  farmerLooksAway: 'tick',
  farmerLooksBack: 'tock',
  farmerPokeWindup: 'warn',
  farmerShortcut: 'tick',
  cornered: 'warn',
  farmerSwipe: 'whoosh',
  slippedPast: 'sneak',
  hatHop: 'bonk',
  bowledOver: 'smash',
  decoyThrown: 'flutter',
  decoyTaken: 'golden',
  decoyEarned: 'feather',
  decoyEmpty: 'dashEmpty',
};
