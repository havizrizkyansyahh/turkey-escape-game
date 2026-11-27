// Short-lived visual bits (feathers, dust, straw, sparks, steam) and floating score words.
// They live in world coordinates and never affect the chase.

const MAX_PARTICLES = 420;

export function spawnBurst(particles, random, options) {
  const {
    x,
    y,
    count,
    kind,
    colors,
    speed = 220,
    angle = -Math.PI / 2,
    spread = Math.PI * 2,
    life = 0.8,
    size = 6,
    gravity = 600,
  } = options;
  for (let i = 0; i < count; i += 1) {
    const direction = angle + (random.next() - 0.5) * spread;
    const velocity = speed * (0.4 + random.next() * 0.8);
    particles.push({
      kind,
      x,
      y,
      vx: Math.cos(direction) * velocity,
      vy: Math.sin(direction) * velocity,
      life: life * (0.6 + random.next() * 0.6),
      maxLife: life,
      size: size * (0.6 + random.next() * 0.8),
      angle: random.next() * Math.PI * 2,
      spin: (random.next() - 0.5) * 10,
      color: colors[Math.floor(random.next() * colors.length)],
      gravity,
    });
  }
  if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES);
}

export function spawnPopup(popups, { text, x, y, color = '#ffd166', size = 22, life = 1.1, hint = false }) {
  popups.push({ text, x, y, color, size, life, maxLife: life, hint });
}

function removeExpired(list) {
  let keep = 0;
  for (const item of list) if (item.life > 0) list[keep++] = item;
  list.length = keep;
}

export function updateEffects(particles, popups, dt) {
  for (const p of particles) {
    p.life -= dt;
    p.vy += p.gravity * dt;
    if (p.kind === 'feather' || p.kind === 'leaf') {
      p.vx *= 1 - Math.min(1, dt * 2.2);
      p.vy = Math.min(p.vy, 70);
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.angle += p.spin * dt;
  }
  removeExpired(particles);
  for (const popup of popups) {
    popup.life -= dt;
    popup.y -= (popup.hint ? 10 : 40) * dt;
  }
  removeExpired(popups);
}
