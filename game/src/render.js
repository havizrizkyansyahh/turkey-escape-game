// Composes one frame of the chase, back to front: the backdrop, hiding spots and the oven, Farmer
// Bramble, the floor obstacles, Tom, the beams and flames that pass in front of him, effects,
// the farmer's speech, and a red vignette when he is about to grab.

import { GROUND_Y, VIEW_WIDTH, VIEW_HEIGHT } from './config.js';
import { drawBackdrops } from './art/backdrops.js';
import { drawProps } from './art/props-art.js';
import { drawTurkey, turkeyLook } from './art/turkey-art.js';
import { drawFarmer, farmerLook } from './art/farmer-art.js';
import { drawParticles, drawPopups, drawSpeechBubble, drawFarmerAlert } from './art/effects-art.js';
import { groundShadow, roundRectPath, fillAndOutline } from './art/brush.js';
import { INK } from './art/palette.js';
import { dangerLevel } from './run.js';

function drawSpeedLines(ctx, x, y, time) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 246, 229, 0.75)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i += 1) {
    const length = 26 + ((time * 400 + i * 23) % 30);
    const lineY = y - 18 - i * 12;
    ctx.beginPath();
    ctx.moveTo(x - 40 - i * 6, lineY);
    ctx.lineTo(x - 40 - i * 6 - length, lineY);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTurkeySprite(ctx, run, cameraX, time) {
  const turkey = run.turkey;
  if (turkey.hiddenIn || turkey.caught) return; // hidden: the spot shows his eyes; caught: the farmer holds him
  const x = turkey.x - cameraX;
  const height = Math.max(0, GROUND_Y - turkey.y);
  const fade = Math.max(0.35, 1 - height / 220);
  groundShadow(ctx, x, GROUND_Y, 26 * fade, 0.26 * fade);
  if (turkey.dashLeft > 0 || turkey.sneakBoostLeft > 0) drawSpeedLines(ctx, x, turkey.y, time);
  drawTurkey(ctx, x, turkey.y, turkeyLook(turkey, time), time);
}

function drawDangerVignette(ctx, level, time) {
  if (level <= 0) return;
  const beat = 0.65 + 0.35 * Math.sin(time * 10);
  const vignette = ctx.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_HEIGHT * 0.42, VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH * 0.72);
  vignette.addColorStop(0, 'rgba(200, 30, 20, 0)');
  vignette.addColorStop(1, `rgba(200, 30, 20, ${0.42 * level * beat})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}

// While he searches a hiding spot, the farmer's line of sight shows as a cone: hot amber while he
// stares at the spot (stay put), a faint wash while he looks away (sneak out now). In the dark barn
// and on the dusky porch he carries a lantern.
function drawSearchCone(ctx, farmer, farmerX, stageIndex, time) {
  if (farmer.state !== 'search' && farmer.state !== 'pokeWindup') return;
  const staring = farmer.state === 'pokeWindup' || farmer.lookingAtSpot;
  const apexX = farmerX + 14 * farmer.facing;
  const apexY = GROUND_Y - 160;
  const length = 300;
  const spread = 0.36;
  const aim = farmer.facing > 0 ? 0.42 : Math.PI - 0.42; // looking down toward the spot
  const flicker = 1 + Math.sin(time * 17) * 0.04;
  const beam = ctx.createRadialGradient(apexX, apexY, 8, apexX, apexY, length);
  beam.addColorStop(0, staring ? `rgba(255, 196, 64, ${0.55 * flicker})` : 'rgba(255, 246, 229, 0.2)');
  beam.addColorStop(1, staring ? 'rgba(255, 160, 40, 0.06)' : 'rgba(255, 246, 229, 0)');
  ctx.save();
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(apexX, apexY);
  ctx.arc(apexX, apexY, length, aim - spread, aim + spread);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (stageIndex === 1 || stageIndex === 3) drawLantern(ctx, farmerX - 22 * farmer.facing, GROUND_Y - 96, time);
}

function drawLantern(ctx, x, y, time) {
  const glow = ctx.createRadialGradient(x, y + 12, 2, x, y + 12, 46);
  glow.addColorStop(0, `rgba(255, 214, 120, ${0.55 + Math.sin(time * 13) * 0.08})`);
  glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 46, y - 34, 92, 92);
  roundRectPath(ctx, x - 9, y, 18, 26, 4);
  fillAndOutline(ctx, '#ffd98a', 2.5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, 7, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#3b2416';
  ctx.fillRect(x - 11, y - 3, 22, 5);
  ctx.fillRect(x - 11, y + 24, 22, 5);
}

export function drawRunScene(ctx, run) {
  const camera = run.camera;
  const cameraX = camera.x + camera.offsetX;
  const time = run.time;
  const farmer = run.farmer;
  const farmerX = farmer.x - cameraX;
  const farmerVisible = farmerX > -140 && farmerX < VIEW_WIDTH + 140;

  ctx.save();
  ctx.translate(0, camera.offsetY);
  drawBackdrops(ctx, cameraX, time);
  drawProps(ctx, run.course.entities, cameraX, 'back', time);
  if (farmerVisible) drawFarmer(ctx, farmerX, farmer.y, farmerLook(farmer, run.turkey), time);
  drawProps(ctx, run.course.entities, cameraX, 'floor', time);
  drawTurkeySprite(ctx, run, cameraX, time);
  drawProps(ctx, run.course.entities, cameraX, 'front', time);
  if (farmerVisible) drawSearchCone(ctx, farmer, farmerX, run.stageIndex, time);
  drawParticles(ctx, run.particles, cameraX);
  if (farmerVisible) {
    drawFarmerAlert(ctx, farmer, farmerX, time);
    if (farmer.speech && farmer.speechLeft > 0) {
      drawSpeechBubble(ctx, farmer.speech, farmerX + 22 * farmer.facing, GROUND_Y - 246, Math.min(1, farmer.speechLeft * 3));
    }
  }
  drawPopups(ctx, run.popups, cameraX);
  ctx.restore();
  drawDangerVignette(ctx, dangerLevel(run), time);
}
