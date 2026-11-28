// The title screen, the how-to-play card, the pause card and the two end screens (escaped into the
// woods, or caught for dinner), with the clickable buttons each one offers.

import { GROUND_Y, VIEW_WIDTH, VIEW_HEIGHT } from '../config.js';
import { PALETTE as P, INK } from '../art/palette.js';
import { panel, chunkyText, plainText, roundRectPath, fillAndOutline, ellipsePath, star, textWidth, BODY_FONT } from '../art/brush.js';
import { drawSceneBackdrop } from '../art/backdrops.js';
import { drawTurkey } from '../art/turkey-art.js';
import { drawFarmer } from '../art/farmer-art.js';
import { drawProps } from '../art/props-art.js';
import { drawSpeechBubble, drawSightCone, drawLantern } from '../art/effects-art.js';
import { STAGE_COLORS } from './hud.js';
import { MEDALS } from '../medals.js';
import { hatName } from '../wardrobe.js';

export function titleButtons(game) {
  return [
    { id: 'start', label: 'START RUN', x: 360, y: 262, w: 240, h: 58, primary: true },
    { id: 'help', label: game.showHelp ? 'CLOSE HELP' : 'HOW TO PLAY', x: 332, y: 334, w: 144, h: 42 },
    { id: 'sound', label: game.muted ? 'SOUND: OFF' : 'SOUND: ON', x: 484, y: 334, w: 144, h: 42 },
    { id: 'wardrobe', label: `DISGUISE: ${hatName(game.hat).toUpperCase()}  [T]`, x: 316, y: 430, w: 328, h: 34 },
  ];
}

export function pauseButtons() {
  return [
    { id: 'resume', label: 'RESUME', x: 380, y: 262, w: 200, h: 52, primary: true },
    { id: 'restart', label: 'RESTART RUN', x: 380, y: 326, w: 200, h: 42 },
    { id: 'quit', label: 'QUIT TO TITLE', x: 380, y: 378, w: 200, h: 42 },
  ];
}

export function endButtons() {
  return [
    { id: 'again', label: 'RUN AGAIN', x: 560, y: 490, w: 214, h: 56, primary: true },
    { id: 'title', label: 'TITLE', x: 786, y: 490, w: 134, h: 56 },
  ];
}

export function buttonAt(buttons, point) {
  for (const button of buttons) {
    if (point.x >= button.x && point.x <= button.x + button.w && point.y >= button.y && point.y <= button.y + button.h) return button.id;
  }
  return null;
}

function drawButtons(ctx, buttons, pointer) {
  for (const button of buttons) {
    const hovered = pointer && buttonAt([button], pointer) === button.id;
    const lift = hovered ? -3 : 0;
    roundRectPath(ctx, button.x, button.y + 5, button.w, button.h, 14);
    ctx.fillStyle = 'rgba(43, 26, 18, 0.55)';
    ctx.fill();
    roundRectPath(ctx, button.x, button.y + lift, button.w, button.h, 14);
    const fill = ctx.createLinearGradient(0, button.y, 0, button.y + button.h);
    if (button.primary) {
      fill.addColorStop(0, hovered ? '#ffad55' : '#f59a3e');
      fill.addColorStop(1, '#d4621f');
    } else {
      fill.addColorStop(0, hovered ? '#7a5238' : '#6b4730');
      fill.addColorStop(1, '#4a2f1e');
    }
    fillAndOutline(ctx, fill, 3);
    chunkyText(ctx, button.label, button.x + button.w / 2, button.y + button.h / 2 + lift + 1, { size: button.primary ? 24 : 15, outline: 4, shadow: false });
  }
}

// ---------------------------------------------------------------- title

function drawRibbon(ctx, x, y, text) {
  const width = 470;
  ctx.fillStyle = '#7c2119';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * (width / 2 - 20), y - 14);
    ctx.lineTo(x + side * (width / 2 + 34), y - 14);
    ctx.lineTo(x + side * (width / 2 + 18), y + 4);
    ctx.lineTo(x + side * (width / 2 + 34), y + 22);
    ctx.lineTo(x + side * (width / 2 - 20), y + 22);
    ctx.closePath();
    fillAndOutline(ctx, '#7c2119', 3);
  }
  roundRectPath(ctx, x - width / 2, y - 20, width, 36, 6);
  fillAndOutline(ctx, P.barnRed, 3);
  chunkyText(ctx, text, x, y - 1, { size: 17, fill: P.cream, outline: 0, shadow: false });
}

function drawLogo(ctx, x, y, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 2.2) * 0.02);
  chunkyText(ctx, 'NOT ON THE', 0, -38, { size: 46, fill: P.cream, outline: 10 });
  const bounce = 1 + Math.sin(time * 4.4) * 0.02;
  ctx.scale(bounce, bounce);
  chunkyText(ctx, 'MENU!', 0, 34, { size: 110, fill: '#ff8a2a', outline: 14 });
  ctx.restore();
}

function drawHelpCard(ctx) {
  ctx.fillStyle = 'rgba(20, 10, 5, 0.55)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  panel(ctx, 140, 96, 680, 418, { radius: 22, fill: 'rgba(43, 26, 18, 0.94)' });
  chunkyText(ctx, 'HOW TO ESCAPE', 480, 130, { size: 32, fill: P.uiGold, outline: 6 });
  const rows = [
    ['SPACE / W / CLICK', 'Jump. Press again in the air to FLUTTER higher.'],
    ['DOWN / S', 'Duck under beams, tablecloths and high knives.'],
    ['RIGHT / D   LEFT / A', 'Run faster, or slow down to time the oven.'],
    ['SHIFT / RIGHT-CLICK', 'Gobble-dash: outrun the farmer, smash pumpkins.'],
    ['Q', 'Toss a corn decoy: he stops to sniff it (25 corn = 1 more).'],
    ['E', 'Hide in a haystack, barrel or the pantry...'],
    ['', '...and sneak out the moment he looks away!'],
    ['CORNERED?', 'Arms up: duck. Arms low: jump. Hop his hat, or toss corn!'],
    ['P / M / H', 'Pause, sound, and the key strip.'],
  ];
  rows.forEach(([keys, text], index) => {
    const y = 172 + index * 31;
    if (keys) {
      roundRectPath(ctx, 172, y - 14, 196, 28, 8);
      fillAndOutline(ctx, '#6b4730', 2, P.uiGold);
      plainText(ctx, keys, 270, y, { size: 13, align: 'center', weight: '800' });
    }
    plainText(ctx, text, 384, y, { size: 15, color: P.uiText });
  });
  plainText(ctx, 'Dodge the oven blast, boiling pots and the carving knives: three tail feathers, three hits.', 480, 456, { size: 14, align: 'center', color: P.uiGold, weight: '800' });
  plainText(ctx, 'Corn fills your gobble-dash. Reach the woods behind the farmhouse to escape!', 480, 482, { size: 14, align: 'center', color: 'rgba(255, 246, 229, 0.85)' });
}

export function drawTitleScreen(ctx, game) {
  const time = game.time;
  drawSceneBackdrop(ctx, 'farmyard', 420, time);
  drawWrongHaystackSearch(ctx, time);
  drawSneakingTom(ctx, 176, time, game.hat);
  drawLogo(ctx, 480, 112, time);
  drawRibbon(ctx, 480, 214, "TOM WATTLE'S GREAT THANKSGIVING ESCAPE");
  drawButtons(ctx, titleButtons(game), game.pointer);
  const best = game.best;
  panel(ctx, 316, 392, 328, 30, { radius: 10 });
  plainText(ctx, `BEST ${best.score.toLocaleString('en-US')}  ·  ESCAPES ${best.escapes}  ·  MEDALS ${(best.medals ?? []).length}/${MEDALS.length}`, 480, 408, { size: 14, align: 'center', color: P.uiGold, weight: '800' });
  drawStageMap(ctx);
  if (game.showHelp) drawHelpCard(ctx);
}

// The attract scene: Farmer Bramble shines his lantern into the wrong haystack...
function drawWrongHaystackSearch(ctx, time) {
  const haystack = { kind: 'haystack', x: 646, y: GROUND_Y, w: 136, h: 118, gone: false, used: false, occupied: false, timer: 0 };
  drawProps(ctx, [haystack], 0, 'back', time);
  drawFarmer(ctx, 858, GROUND_Y, { arms: 'shade', moving: false, stride: 0, facing: -1, lean: 0.06, mouth: 'grim', brows: 'raised', scale: 1 }, time);
  drawSightCone(ctx, 844, GROUND_Y - 160, -1, true, time);
  drawLantern(ctx, 880, GROUND_Y - 96, time);
  drawSpeechBubble(ctx, 'Here, birdy birdy...', 838, GROUND_Y - 246);
}

// ...while Tom tiptoes off the other way.
function drawSneakingTom(ctx, x, time, hat) {
  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(-1, 1);
  drawTurkey(ctx, 0, GROUND_Y, { pose: 'run', phase: time * 6, flap: time * 4, scale: 1.45, blink: time % 3 < 0.1, hat }, time);
  ctx.restore();
  drawSpeechBubble(ctx, 'Shh...!', x + 10, GROUND_Y - 150);
}

// The route of the escape, from the farmyard to the woods, one stop per stage.
function drawStageMap(ctx) {
  const stops = [
    ['FARMYARD', STAGE_COLORS[0]],
    ['BIG RED BARN', STAGE_COLORS[1]],
    ["GRANDMA'S KITCHEN", STAGE_COLORS[2]],
    ['FRONT PORCH', STAGE_COLORS[3]],
    ['THE WOODS: FREEDOM!', '#3d7a3a'],
  ];
  const widths = stops.map(([name]) => textWidth(ctx, name, 13, BODY_FONT, '800') + 22);
  const arrow = 22;
  const lead = textWidth(ctx, 'ROUTE', 13, BODY_FONT, '800') + 14;
  const total = lead + widths.reduce((sum, width) => sum + width, 0) + arrow * (stops.length - 1);
  let x = (VIEW_WIDTH - total) / 2;
  const y = 568;
  panel(ctx, x - 14, y - 20, total + 28, 40, { radius: 14 });
  plainText(ctx, 'ROUTE', x, y + 1, { size: 13, color: P.uiGold, weight: '800' });
  x += lead;
  stops.forEach(([name, color], index) => {
    roundRectPath(ctx, x, y - 12, widths[index], 24, 8);
    fillAndOutline(ctx, color, 2);
    plainText(ctx, name, x + widths[index] / 2, y + 1, { size: 13, align: 'center', color: P.uiText, weight: '800' });
    x += widths[index];
    if (index < stops.length - 1) {
      plainText(ctx, '→', x + arrow / 2, y + 1, { size: 15, align: 'center', color: P.uiGold, weight: '800' });
      x += arrow;
    }
  });
}

// ---------------------------------------------------------------- pause

export function drawPauseOverlay(ctx, game) {
  ctx.fillStyle = 'rgba(20, 10, 5, 0.6)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  panel(ctx, 330, 150, 300, 300, { radius: 22, fill: 'rgba(43, 26, 18, 0.94)' });
  chunkyText(ctx, 'PAUSED', 480, 200, { size: 44, fill: P.uiGold, outline: 8 });
  plainText(ctx, 'Tom catches his breath...', 480, 236, { size: 14, align: 'center', color: 'rgba(255, 246, 229, 0.85)' });
  drawButtons(ctx, pauseButtons(), game.pointer);
}

// ---------------------------------------------------------------- end screens

function drawFireflies(ctx, time) {
  for (let i = 0; i < 14; i += 1) {
    const x = 60 + ((i * 97) % 440) + Math.sin(time * 0.8 + i) * 18;
    const y = 220 + ((i * 53) % 220) + Math.cos(time * 1.1 + i * 2) * 12;
    const glow = 0.4 + 0.6 * Math.abs(Math.sin(time * 2.4 + i));
    ctx.fillStyle = `rgba(255, 240, 150, ${glow})`;
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEscapedScene(ctx, time, hat) {
  drawSceneBackdrop(ctx, 'woods', 120 + time * 8, time);
  drawFarmer(ctx, 86, GROUND_Y - 40, { arms: 'fist', moving: false, stride: 0, facing: 1, lean: 0, mouth: 'shout', brows: 'angry', scale: 0.42 }, time);
  ellipsePath(ctx, 270, GROUND_Y + 4, 92, 18);
  fillAndOutline(ctx, P.woodDark, 3);
  roundRectPath(ctx, 190, GROUND_Y - 58, 160, 62, 10);
  fillAndOutline(ctx, P.wood, 3);
  ellipsePath(ctx, 270, GROUND_Y - 58, 80, 16);
  fillAndOutline(ctx, P.woodLight, 3);
  ctx.strokeStyle = 'rgba(94, 58, 32, 0.7)';
  ctx.lineWidth = 2;
  ellipsePath(ctx, 270, GROUND_Y - 58, 48, 9);
  ctx.stroke();
  drawTurkey(ctx, 270, GROUND_Y - 62, { pose: 'proud', phase: 0, flap: time * 6, scale: 2.3, blink: time % 3.1 < 0.12, hat }, time);
  drawFireflies(ctx, time);
  ctx.fillStyle = P.amber;
  for (let i = 0; i < 9; i += 1) {
    const fall = (time * 40 + i * 70) % 520;
    ctx.save();
    ctx.translate(40 + i * 56 + Math.sin(time + i) * 20, fall - 20);
    ctx.rotate(time * 2 + i);
    star(ctx, 0, 0, 7, 3.5, 5);
    ctx.fillStyle = [P.maple, P.amber, P.gold][i % 3];
    ctx.fill();
    ctx.restore();
  }
}

function drawCaughtScene(ctx, time) {
  drawSceneBackdrop(ctx, 'kitchen', 31600, time);
  ctx.fillStyle = 'rgba(30, 12, 6, 0.42)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  roundRectPath(ctx, 120, GROUND_Y - 34, 270, 38, [6, 6, 20, 20]);
  fillAndOutline(ctx, '#8d949a', 3);
  roundRectPath(ctx, 108, GROUND_Y - 42, 294, 14, 6);
  fillAndOutline(ctx, P.steel, 3);
  chunkyText(ctx, "TOM'S ROASTING PAN", 255, GROUND_Y - 14, { size: 11, fill: '#3a3a3a', outline: 0, shadow: false });
  drawFarmer(ctx, 250, GROUND_Y - 30, { arms: 'holdUp', moving: false, stride: 0, facing: 1, lean: -0.04, mouth: 'shout', brows: 'angry', holdingTurkey: true, scale: 1.4 }, time);
  drawSpeechBubble(ctx, "Dinner's served!", 150, GROUND_Y - 252);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function drawStatsCard(ctx, summary, game) {
  const left = 548;
  const top = 152;
  panel(ctx, left, top, 372, 322, { radius: 20, fill: 'rgba(43, 26, 18, 0.88)' });
  plainText(ctx, 'RANK', left + 186, top + 24, { size: 13, align: 'center', color: 'rgba(255, 246, 229, 0.7)', weight: '800' });
  chunkyText(ctx, summary.rank.toUpperCase(), left + 186, top + 54, { size: 28, fill: P.uiGold, outline: 6 });
  const rows = [
    ['SCORE', summary.score.toLocaleString('en-US')],
    ['DISTANCE', `${summary.meters} m — ${summary.stageTitle}`],
    ['CORN GOBBLED', String(summary.corn)],
    ['SNEAKY ESCAPES', String(summary.sneaks)],
    ['CLOSE CALLS', String(summary.closeCalls)],
    ['TAIL FEATHERS LEFT', `${summary.livesLeft} of 3`],
    ['TIME', formatTime(summary.seconds)],
  ];
  rows.forEach(([label, value], index) => {
    const y = top + 96 + index * 30;
    plainText(ctx, label, left + 24, y, { size: 14, color: 'rgba(255, 246, 229, 0.75)', weight: '800' });
    plainText(ctx, value, left + 348, y, { size: 15, align: 'right', color: P.uiText, weight: '800' });
    if (index < rows.length - 1) {
      ctx.fillStyle = 'rgba(255, 246, 229, 0.12)';
      ctx.fillRect(left + 24, y + 14, 324, 1);
    }
  });
  if (summary.newBest) {
    ctx.save();
    ctx.translate(left + 330, top + 12);
    ctx.rotate(0.25);
    star(ctx, 0, 0, 34, 24, 12);
    fillAndOutline(ctx, P.uiRed, 3);
    chunkyText(ctx, 'NEW', 0, -7, { size: 12, outline: 3, shadow: false });
    chunkyText(ctx, 'BEST!', 0, 8, { size: 12, outline: 3, shadow: false });
    ctx.restore();
  } else if (game.best.score > 0) {
    plainText(ctx, `Best so far: ${game.best.score.toLocaleString('en-US')}`, left + 186, top + 302, { size: 13, align: 'center', color: P.uiGold, weight: '800' });
  }
}

// The six medals under the end scene: this run's in gold, first-time wins tagged NEW!
function drawMedalRow(ctx, summary) {
  const earned = new Set(summary.medals ?? []);
  const fresh = new Set(summary.newMedals ?? []);
  const left = 24;
  const top = 494;
  panel(ctx, left, top, 516, 96, { radius: 16, fill: 'rgba(43, 26, 18, 0.9)' });
  plainText(ctx, `MEDALS THIS RUN: ${earned.size} OF ${MEDALS.length}`, left + 16, top + 16, { size: 13, color: P.uiGold, weight: '800' });
  const newHats = summary.newHats ?? [];
  if (newHats.length > 0) {
    plainText(ctx, `NEW DISGUISE: ${hatName(newHats[newHats.length - 1]).toUpperCase()}!`, left + 500, top + 16, { size: 13, align: 'right', color: '#ff8f7a', weight: '900' });
  }
  MEDALS.forEach((medal, index) => {
    const x = left + 48 + index * 84;
    const y = top + 48;
    const won = earned.has(medal.id);
    drawMedal(ctx, x, y, won);
    plainText(ctx, medal.name, x, top + 82, { size: 10, align: 'center', color: won ? P.uiText : 'rgba(255, 246, 229, 0.42)', weight: '800' });
    if (fresh.has(medal.id)) {
      roundRectPath(ctx, x + 6, y - 26, 34, 15, 5);
      fillAndOutline(ctx, P.uiRed, 2);
      plainText(ctx, 'NEW!', x + 23, y - 18, { size: 10, align: 'center', color: P.uiText, weight: '900' });
    }
  });
}

function drawMedal(ctx, x, y, won) {
  ctx.save();
  ctx.globalAlpha = won ? 1 : 0.35;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * 4, y + 8);
    ctx.lineTo(x + side * 12, y + 24);
    ctx.lineTo(x + side * 3, y + 20);
    ctx.closePath();
    fillAndOutline(ctx, side < 0 ? P.barnRed : '#3f7b77', 2);
  }
  ellipsePath(ctx, x, y, 16, 16);
  fillAndOutline(ctx, won ? '#f2c14e' : '#8c7a66', 2.5);
  star(ctx, x, y, 9, 4, 5);
  fillAndOutline(ctx, won ? '#fff3b0' : '#b3a28c', 1.5);
  ctx.restore();
}

export function drawEndScreen(ctx, game) {
  const summary = game.summary;
  const escaped = summary.outcome === 'escaped';
  if (escaped) drawEscapedScene(ctx, game.time, game.hat);
  else drawCaughtScene(ctx, game.time);
  const pop = Math.min(1, game.time / 0.3);
  ctx.save();
  ctx.translate(480, 74);
  ctx.scale(0.7 + 0.3 * pop, 0.7 + 0.3 * pop);
  chunkyText(ctx, escaped ? 'ESCAPED!' : 'CAUGHT!', 0, 0, { size: 88, fill: escaped ? '#a6e35f' : '#ff5a4e', outline: 13 });
  ctx.restore();
  const subtitle = escaped ? "Tom is nobody's dinner tonight!" : `Farmer Bramble nabbed Tom in ${summary.stageTitle}.`;
  chunkyText(ctx, subtitle, 480, 134, { size: 22, fill: P.cream, outline: 5 });
  drawStatsCard(ctx, summary, game);
  drawMedalRow(ctx, summary);
  drawButtons(ctx, endButtons(), game.pointer);
  plainText(ctx, 'ENTER or R to run again  ·  ESC for the title', 734, 566, { size: 13, align: 'center', color: 'rgba(255, 246, 229, 0.85)', weight: '800' });
}
