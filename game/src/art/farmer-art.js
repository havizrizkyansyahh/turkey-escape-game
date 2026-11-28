// Farmer Bramble: straw hat, bushy beard, red plaid flannel and blue overalls. His arms say what
// he is about to do: reaching with a carving fork (chasing), both arms up (about to lunge), a
// carving knife raised (about to throw), a hand over his eyes (searching), scratching his head
// (confused), and Tom held up by the feet when the chase is lost.

import { PALETTE as P, INK } from './palette.js';
import { ellipsePath, roundRectPath, fillAndOutline, limb, groundShadow } from './brush.js';
import { drawTurkey } from './turkey-art.js';

const SHOULDER_FRONT = [17, -128];
const SHOULDER_BACK = [-16, -128];

const ARMS_BY_STATE = {
  chase: 'reach',
  approach: 'reach',
  recover: 'reach',
  windup: 'raise',
  lunge: 'lunge',
  aim: 'throw',
  search: 'shade',
  pokeWindup: 'pokeReady',
  poke: 'poke',
  confused: 'scratch',
  celebrate: 'holdUp',
  defeated: 'fist',
  shortcut: 'reach',
  stunned: 'scratch',
  tumble: 'scratch',
};

// In an ambush his arms telegraph the grab: high and wide (duck under) or low to scoop (jump over).
function ambushArms(farmer) {
  return farmer.ambushHigh ? 'block' : 'scoop';
}

export function farmerLook(farmer, turkey) {
  const moving = Math.abs(farmer.vx) > 20;
  let lean = 0;
  const ambushing = farmer.state === 'cornering' || farmer.state === 'swipe';
  if (farmer.state === 'lunge') lean = 0.34;
  else if (farmer.state === 'swipe') lean = farmer.ambushHigh ? 0.2 : 0.42;
  else if (farmer.state === 'cornering') lean = farmer.ambushHigh ? -0.04 : 0.22;
  else if (farmer.state === 'stunned') lean = -0.16;
  else if (farmer.state === 'windup') lean = -0.1;
  else if (farmer.state === 'poke') lean = 0.18;
  else if (moving) lean = 0.1;
  const shouting = ambushing || ['windup', 'lunge', 'aim', 'celebrate', 'defeated', 'poke', 'pokeWindup', 'shortcut'].includes(farmer.state);
  return {
    arms: ambushing ? ambushArms(farmer) : ARMS_BY_STATE[farmer.state] ?? 'reach',
    moving,
    stride: farmer.runPhase,
    facing: farmer.facing,
    lean,
    mouth: shouting ? 'shout' : farmer.state === 'confused' ? 'o' : 'grim',
    brows: ['confused', 'search', 'stunned', 'tumble'].includes(farmer.state) ? 'raised' : 'angry',
    holdingTurkey: farmer.state === 'celebrate' && turkey.caught,
    scale: 1,
  };
}

function armsFor(look) {
  const s = look.moving ? Math.sin(look.stride) : 0;
  switch (look.arms) {
    case 'raise':
      return { back: [SHOULDER_BACK, [-24, -156], [-14, -186]], front: [SHOULDER_FRONT, [27, -158], [33, -188]], hand: 'open' };
    case 'lunge':
      return { back: [SHOULDER_BACK, [16, -118], [56, -108]], front: [SHOULDER_FRONT, [44, -124], [74, -118]], hand: 'open' };
    case 'block':
      return { back: [SHOULDER_BACK, [2, -158], [34, -170]], front: [SHOULDER_FRONT, [46, -156], [78, -164]], hand: 'open' };
    case 'scoop':
      return { back: [SHOULDER_BACK, [8, -98], [36, -56]], front: [SHOULDER_FRONT, [42, -94], [70, -50]], hand: 'open' };
    case 'throw':
      return { back: [SHOULDER_BACK, [-34, -152], [-22, -182]], front: [SHOULDER_FRONT, [38, -124], [58, -130]], hand: 'open', backTool: 'knife' };
    case 'shade':
      return { back: [SHOULDER_BACK, [-30, -110], [-20, -94]], front: [SHOULDER_FRONT, [33, -146], [22, -161]], hand: 'flat' };
    case 'pokeReady':
      return { back: [SHOULDER_BACK, [-2, -112], [16, -106]], front: [SHOULDER_FRONT, [30, -112], [44, -106]], hand: 'grip', pitchfork: 0 };
    case 'poke':
      return { back: [SHOULDER_BACK, [18, -112], [40, -106]], front: [SHOULDER_FRONT, [48, -112], [68, -106]], hand: 'grip', pitchfork: 26 };
    case 'scratch':
      return { back: [SHOULDER_BACK, [-30, -110], [-22, -94]], front: [SHOULDER_FRONT, [29, -160], [11, -183]], hand: 'open' };
    case 'holdUp':
      return { back: [SHOULDER_BACK, [-32, -114], [-36, -96]], front: [SHOULDER_FRONT, [41, -152], [60, -178]], hand: 'grip', backTool: 'knife' };
    case 'fist':
      return { back: [SHOULDER_BACK, [-30, -112], [-24, -96]], front: [SHOULDER_FRONT, [35, -152], [39, -179]], hand: 'fist' };
    default:
      return {
        back: [SHOULDER_BACK, [-28, -110 - s * 10], [-30 + s * 18, -92 - s * 6]],
        front: [SHOULDER_FRONT, [36, -118 + s * 6], [56, -112 + s * 8]],
        hand: 'open',
        backTool: 'fork',
      };
  }
}

function drawLegs(ctx, look) {
  for (const back of [true, false]) {
    const legPhase = look.stride + (back ? Math.PI : 0);
    const swing = look.moving ? Math.sin(legPhase) * 0.62 : back ? -0.08 : 0.08;
    const lift = look.moving ? Math.max(0, -Math.cos(legPhase)) * 12 : 0;
    const hipX = back ? -9 : 9;
    const footX = hipX + Math.sin(swing) * 36;
    const footY = -lift;
    const kneeX = (hipX + footX) / 2 + 9;
    const kneeY = -38 - lift * 0.4;
    limb(ctx, [[hipX, -74], [kneeX, kneeY], [footX, footY - 9]], 15, back ? P.overallsDark : P.overalls, 3);
    roundRectPath(ctx, footX - 10, footY - 14, 29, 15, [6, 10, 4, 4]);
    fillAndOutline(ctx, P.boots, 3);
  }
}

function drawPlaid(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(90, 18, 14, 0.42)';
  for (let i = 0; i < w; i += 12) ctx.fillRect(x + i, y, 5, h);
  for (let j = 0; j < h; j += 12) ctx.fillRect(x, y + j, w, 5);
  ctx.fillStyle = 'rgba(255, 210, 170, 0.35)';
  for (let i = 8; i < w; i += 12) ctx.fillRect(x + i, y, 1.4, h);
}

function drawTorso(ctx) {
  roundRectPath(ctx, -27, -141, 54, 58, 16);
  ctx.fillStyle = P.flannel;
  ctx.fill();
  ctx.save();
  ctx.clip();
  drawPlaid(ctx, -27, -141, 54, 58);
  ctx.restore();
  roundRectPath(ctx, -27, -141, 54, 58, 16);
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-16, -124);
  ctx.lineTo(16, -124);
  ctx.lineTo(19, -101);
  ctx.quadraticCurveTo(31, -92, 27, -75);
  ctx.quadraticCurveTo(0, -63, -27, -75);
  ctx.quadraticCurveTo(-31, -92, -19, -101);
  ctx.closePath();
  fillAndOutline(ctx, P.overalls, 3);
  roundRectPath(ctx, -8, -119, 16, 12, 3);
  fillAndOutline(ctx, P.overallsDark, 2);
  limb(ctx, [[-13, -124], [-19, -139]], 5, P.overalls, 2);
  limb(ctx, [[13, -124], [19, -139]], 5, P.overalls, 2);
  for (const bx of [-13, 13]) {
    ellipsePath(ctx, bx, -122, 3.2, 3.2);
    fillAndOutline(ctx, P.gold, 1.5);
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-14, -98);
  ctx.quadraticCurveTo(0, -92, 14, -98);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawHand(ctx, point, kind) {
  const [x, y] = point;
  if (kind === 'flat') {
    ellipsePath(ctx, x, y, 9, 5, -0.2);
    fillAndOutline(ctx, P.skin, 2.5);
    return;
  }
  ellipsePath(ctx, x, y, kind === 'fist' ? 7.5 : 8, kind === 'fist' ? 7 : 7.5);
  fillAndOutline(ctx, P.skin, 2.5);
  if (kind === 'open') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 4);
    ctx.lineTo(x + 6, y - 6);
    ctx.stroke();
  }
}

function drawCarvingFork(ctx, [x, y]) {
  limb(ctx, [[x, y + 4], [x + 3, y - 26]], 6, P.woodDark, 2);
  limb(ctx, [[x + 3, y - 26], [x + 4, y - 40]], 3, P.steel, 1.5);
  limb(ctx, [[x + 4, y - 40], [x - 1, y - 56]], 2.4, P.steel, 1.5);
  limb(ctx, [[x + 4, y - 40], [x + 9, y - 56]], 2.4, P.steel, 1.5);
}

function drawCarvingKnife(ctx, [x, y]) {
  limb(ctx, [[x, y + 6], [x + 1, y - 10]], 7, '#3a2418', 2);
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 10);
  ctx.lineTo(x + 6, y - 10);
  ctx.lineTo(x + 5, y - 52);
  ctx.quadraticCurveTo(x + 1, y - 60, x - 4, y - 50);
  ctx.closePath();
  const blade = ctx.createLinearGradient(x - 4, 0, x + 6, 0);
  blade.addColorStop(0, '#f4f7f9');
  blade.addColorStop(1, P.steelDark);
  fillAndOutline(ctx, blade, 2);
}

function drawPitchfork(ctx, push) {
  const tip = 104 + push;
  limb(ctx, [[-36, -98], [tip - 24, -108]], 5, P.woodLight, 2);
  limb(ctx, [[tip - 26, -116], [tip - 24, -100]], 4, P.steelDark, 1.5);
  for (const dy of [-114, -108, -102]) limb(ctx, [[tip - 25, dy], [tip, dy - 1]], 2.6, P.steel, 1.5);
}

function drawHead(ctx, look) {
  const cx = 4;
  const cy = -153;
  ellipsePath(ctx, cx - 15, cy + 2, 5, 7.5);
  fillAndOutline(ctx, P.skinShade, 2.5);
  ellipsePath(ctx, cx, cy, 18, 19);
  fillAndOutline(ctx, P.skin, 3);

  ctx.beginPath();
  ctx.moveTo(cx - 17, cy - 1);
  ctx.bezierCurveTo(cx - 23, cy + 22, cx - 5, cy + 36, cx + 8, cy + 31);
  ctx.bezierCurveTo(cx + 23, cy + 27, cx + 25, cy + 8, cx + 18, cy - 1);
  ctx.bezierCurveTo(cx + 12, cy + 7, cx - 8, cy + 9, cx - 17, cy - 1);
  ctx.closePath();
  fillAndOutline(ctx, P.beard, 3);
  ctx.strokeStyle = P.beardDark;
  ctx.lineWidth = 1.6;
  for (const [x1, y1, x2, y2] of [[cx - 10, cy + 12, cx - 7, cy + 22], [cx - 2, cy + 16, cx, cy + 27], [cx + 12, cy + 15, cx + 13, cy + 24]]) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  if (look.mouth === 'shout') {
    ellipsePath(ctx, cx + 9, cy + 15, 6.5, 5.5);
    fillAndOutline(ctx, '#5a1e16', 2);
    ellipsePath(ctx, cx + 9, cy + 18, 3.5, 2);
    ctx.fillStyle = '#e86a6a';
    ctx.fill();
  } else if (look.mouth === 'o') {
    ellipsePath(ctx, cx + 9, cy + 15, 3.5, 4);
    fillAndOutline(ctx, '#5a1e16', 2);
  }
  ellipsePath(ctx, cx + 5, cy + 7, 8, 4, 0.25);
  ctx.fillStyle = P.beardDark;
  ctx.fill();
  ellipsePath(ctx, cx + 16, cy + 6, 7, 3.6, -0.2);
  ctx.fill();

  ellipsePath(ctx, cx + 17, cy - 1, 6.2, 5.6);
  fillAndOutline(ctx, P.nose, 2.5);
  ellipsePath(ctx, cx + 7, cy - 7, 2.6, 3.3);
  ctx.fillStyle = INK;
  ctx.fill();
  ellipsePath(ctx, cx + 15, cy - 8, 2.4, 3.1);
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.beginPath();
  if (look.brows === 'raised') {
    ctx.moveTo(cx + 2, cy - 15);
    ctx.lineTo(cx + 10, cy - 17);
    ctx.moveTo(cx + 12, cy - 17);
    ctx.lineTo(cx + 19, cy - 16);
  } else {
    ctx.moveTo(cx + 1, cy - 15);
    ctx.lineTo(cx + 10, cy - 11);
    ctx.moveTo(cx + 12, cy - 11);
    ctx.lineTo(cx + 20, cy - 15);
  }
  ctx.stroke();

  ellipsePath(ctx, cx + 1, cy - 16, 31, 7, -0.05);
  fillAndOutline(ctx, P.hat, 3);
  ctx.beginPath();
  ctx.moveTo(cx - 15, cy - 18);
  ctx.quadraticCurveTo(cx - 15, cy - 41, cx + 1, cy - 41);
  ctx.quadraticCurveTo(cx + 17, cy - 41, cx + 16, cy - 18);
  ctx.closePath();
  fillAndOutline(ctx, P.hat, 3);
  ctx.beginPath();
  ctx.moveTo(cx - 15, cy - 25);
  ctx.lineTo(cx + 16, cy - 25);
  ctx.lineTo(cx + 16, cy - 19);
  ctx.lineTo(cx - 15, cy - 19);
  ctx.closePath();
  fillAndOutline(ctx, P.hatBand, 2);
  ctx.strokeStyle = P.hatShade;
  ctx.lineWidth = 1.4;
  for (let i = -24; i <= 26; i += 7) {
    ctx.beginPath();
    ctx.moveTo(cx + i, cy - 13);
    ctx.lineTo(cx + i + 3, cy - 19);
    ctx.stroke();
  }
}

export function drawFarmer(ctx, x, y, look, time = 0) {
  const scale = look.scale ?? 1;
  ctx.save();
  ctx.translate(x, y);
  groundShadow(ctx, 0, 0, 46 * scale);
  ctx.scale(look.facing * scale, scale);
  const arms = armsFor(look);

  drawLegs(ctx, look);
  ctx.save();
  ctx.translate(0, -74);
  ctx.rotate(look.lean);
  ctx.translate(0, 74);

  limb(ctx, arms.back, 11, P.flannel, 3);
  drawHand(ctx, arms.back[2], arms.hand === 'flat' ? 'fist' : arms.hand);
  if (arms.backTool === 'fork') drawCarvingFork(ctx, arms.back[2]);
  if (arms.backTool === 'knife') drawCarvingKnife(ctx, arms.back[2]);

  drawTorso(ctx);
  drawHead(ctx, look);

  limb(ctx, arms.front, 11, P.flannel, 3);
  drawHand(ctx, arms.front[2], arms.hand);
  if (arms.pitchfork !== undefined) drawPitchfork(ctx, arms.pitchfork);
  if (look.holdingTurkey) {
    ctx.save();
    ctx.translate(arms.front[2][0], arms.front[2][1] + 4);
    ctx.rotate(Math.PI + Math.sin(time * 6) * 0.12);
    drawTurkey(ctx, 0, 0, { pose: 'scared', flap: time * 14, phase: 0, scale: 0.95 }, time);
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}
