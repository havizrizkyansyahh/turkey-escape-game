// Entry point: fits the canvas to the window, wires input and sound, and runs the fixed-step game
// loop. With ?shot=<name> it stages one exact scene for a screenshot instead of playing.

import { VIEW_WIDTH, VIEW_HEIGHT, STEP_SECONDS } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createGame, updateGame, drawGame } from './game.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let pixelScale = 1;

function fitCanvasToWindow() {
  const width = document.documentElement.clientWidth || window.innerWidth;
  const height = document.documentElement.clientHeight || window.innerHeight;
  const scale = Math.min(width / VIEW_WIDTH, height / VIEW_HEIGHT);
  const ratio = window.devicePixelRatio || 1;
  canvas.style.width = `${Math.floor(VIEW_WIDTH * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_HEIGHT * scale)}px`;
  canvas.width = Math.round(VIEW_WIDTH * scale * ratio);
  canvas.height = Math.round(VIEW_HEIGHT * scale * ratio);
  pixelScale = canvas.width / VIEW_WIDTH;
}

function render(game) {
  ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  drawGame(ctx, game);
}

const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isFinite(seedParam) ? seedParam : Math.floor(Math.random() * 1e9);
const shot = params.get('shot');

fitCanvasToWindow();

if (shot) {
  const game = createGame({ seed, shotMode: true });
  stageShot(game, shot);
  // Paint now, and again once the page has its final size (headless browsers resize late).
  const paint = () => {
    fitCanvasToWindow();
    render(game);
    document.body.dataset.shotReady = shot;
  };
  paint();
  window.addEventListener('load', paint);
  window.addEventListener('resize', paint);
} else {
  const audio = createAudio();
  const input = createInput(canvas, audio);
  const game = createGame({ seed, audio });
  window.addEventListener('resize', () => {
    fitCanvasToWindow();
    render(game);
  });
  canvas.focus();
  let last = performance.now();
  let pending = 0;
  const frame = (now) => {
    pending = Math.min(pending + (now - last) / 1000, 0.25);
    last = now;
    while (pending >= STEP_SECONDS) {
      updateGame(game, input.read(), STEP_SECONDS);
      pending -= STEP_SECONDS;
    }
    render(game);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
