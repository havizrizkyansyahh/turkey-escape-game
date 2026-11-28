// Keyboard and mouse, turned into game actions. A press is queued until the game reads it, so a tap
// is never lost between fixed simulation steps; held keys are read fresh every time.

import { VIEW_WIDTH, VIEW_HEIGHT } from './config.js';

export function createInput(canvas, audio) {
  const held = new Set();
  const pressed = new Set();
  const pointer = { x: -1, y: -1, inside: false, clicked: null, rightClicked: false, held: false };

  function trackPointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
    pointer.y = ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT;
    pointer.inside = pointer.x >= 0 && pointer.x <= VIEW_WIDTH && pointer.y >= 0 && pointer.y <= VIEW_HEIGHT;
  }

  window.addEventListener('keydown', (event) => {
    if (KEYS_WITH_BROWSER_DEFAULTS.has(event.code)) event.preventDefault();
    audio?.unlock();
    if (!event.repeat) pressed.add(event.code);
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => {
    held.clear();
    pointer.held = false;
  });
  canvas.addEventListener('pointermove', trackPointer);
  canvas.addEventListener('pointerdown', (event) => {
    trackPointer(event);
    audio?.unlock();
    canvas.focus();
    if (event.button === 2) pointer.rightClicked = true;
    else {
      pointer.clicked = { x: pointer.x, y: pointer.y };
      pointer.held = true;
    }
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button !== 2) pointer.held = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  const isHeld = (action) => ACTION_KEYS[action].some((code) => held.has(code));
  const wasPressed = (action) => ACTION_KEYS[action].some((code) => pressed.has(code));

  return {
    read() {
      const snapshot = {
        left: isHeld('left'),
        right: isHeld('right'),
        duck: isHeld('duck'),
        jump: isHeld('jump') || pointer.held,
        jumpPressed: wasPressed('jump'),
        dashPressed: wasPressed('dash') || pointer.rightClicked,
        hidePressed: wasPressed('hide'),
        pausePressed: wasPressed('pause'),
        confirmPressed: wasPressed('confirm'),
        mutePressed: wasPressed('mute'),
        helpPressed: wasPressed('help'),
        restartPressed: wasPressed('restart'),
        backPressed: wasPressed('back'),
        click: pointer.clicked,
        pointer: { x: pointer.x, y: pointer.y },
      };
      pressed.clear();
      pointer.clicked = null;
      pointer.rightClicked = false;
      return snapshot;
    },
  };
}

const ACTION_KEYS = {
  jump: ['Space', 'ArrowUp', 'KeyW'],
  duck: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  dash: ['ShiftLeft', 'ShiftRight', 'KeyJ'],
  hide: ['KeyE', 'KeyF'],
  pause: ['KeyP', 'Escape'],
  confirm: ['Enter', 'NumpadEnter', 'Space'],
  mute: ['KeyM'],
  help: ['KeyH'],
  restart: ['KeyR'],
  back: ['Escape', 'Backspace'],
};

const KEYS_WITH_BROWSER_DEFAULTS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace']);
