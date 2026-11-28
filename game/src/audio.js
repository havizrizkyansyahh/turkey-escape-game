// Every sound in Not On The Menu! is synthesised with Web Audio while the game runs: no audio
// files and no network. unlock() runs on the first key press or click, because browsers keep sound
// asleep until the player acts. The music is a bouncy barn-dance loop that climbs in key and tempo
// stage by stage, and picks up a nervous hi-hat when the farmer closes in.

export function createAudio() {
  let context = null;
  let master = null;
  let musicBus = null;
  let effectsBus = null;
  let noiseBuffer = null;
  let muted = readMuted();
  const music = { stage: 0, step: 0, nextTime: 0, timer: null, intensity: 0, wanted: false };

  function saveMuted() {
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // storage may be switched off; the setting then lasts this visit only
    }
  }

  function envelope(gain, start, attack, peak, end) {
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
  }

  function tone({ type = 'square', from, to = from, duration, volume = 0.2, delay = 0, at = null, bus = effectsBus, attack = 0.005 }) {
    if (!context || muted) return;
    const start = at ?? context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, to), start + duration);
    envelope(gain, start, attack, volume, start + duration);
    oscillator.connect(gain);
    gain.connect(bus);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function hiss({ duration, volume = 0.2, delay = 0, at = null, type = 'lowpass', from = 1200, to = from, q = 1, bus = effectsBus }) {
    if (!context || muted) return;
    const start = at ?? context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, start);
    if (to !== from) filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), start + duration);
    const gain = context.createGain();
    envelope(gain, start, 0.01, volume, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    source.start(start, Math.random() * 0.5);
    source.stop(start + duration + 0.05);
  }

  // Tom's "gobble-obble-obble": a buzzy voice wobbling in pitch and loudness.
  function gobble(delay = 0, pitch = 1) {
    if (!context || muted) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    oscillator.type = 'sawtooth';
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 2.5;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    for (let i = 0; i < 6; i += 1) {
      const t = start + i * 0.062;
      oscillator.frequency.setValueAtTime((i % 2 ? 360 : 520) * pitch, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.012);
      gain.gain.linearRampToValueAtTime(0.02, t + 0.052);
    }
    gain.gain.linearRampToValueAtTime(0.0001, start + 0.42);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(effectsBus);
    oscillator.start(start);
    oscillator.stop(start + 0.45);
  }

  function arpeggio(notes, type, spacing, duration, volume) {
    notes.forEach((frequency, index) => tone({ type, from: frequency, duration, delay: index * spacing, volume }));
  }

  const SOUNDS = {
    start: () => {
      arpeggio([523, 659, 784], 'triangle', 0.08, 0.12, 0.18);
      gobble(0.25);
    },
    click: () => tone({ type: 'triangle', from: 660, to: 990, duration: 0.07, volume: 0.12 }),
    jump: () => tone({ type: 'square', from: 300, to: 620, duration: 0.15, volume: 0.12 }),
    flutter: () => {
      hiss({ duration: 0.16, volume: 0.25, type: 'bandpass', from: 900, to: 2200, q: 2 });
      hiss({ duration: 0.16, delay: 0.1, volume: 0.2, type: 'bandpass', from: 800, to: 2000, q: 2 });
    },
    dash: () => {
      hiss({ duration: 0.4, volume: 0.25, type: 'highpass', from: 500, to: 2800 });
      gobble(0, 1.15);
    },
    dashEmpty: () => tone({ type: 'square', from: 180, to: 140, duration: 0.12, volume: 0.1 }),
    corn: () => tone({ type: 'triangle', from: 880, to: 1320, duration: 0.08, volume: 0.13 }),
    golden: () => arpeggio([660, 880, 1100, 1320], 'triangle', 0.05, 0.1, 0.15),
    feather: () => arpeggio([784, 988, 1175, 1568], 'triangle', 0.06, 0.12, 0.15),
    stumble: () => {
      tone({ type: 'sawtooth', from: 260, to: 90, duration: 0.25, volume: 0.15 });
      hiss({ duration: 0.12, volume: 0.15, from: 500 });
    },
    bonk: () => {
      tone({ type: 'square', from: 200, to: 120, duration: 0.1, volume: 0.22 });
      tone({ type: 'sine', from: 1200, to: 1800, duration: 0.25, delay: 0.06, volume: 0.07 });
      tone({ type: 'sine', from: 1500, to: 2100, duration: 0.25, delay: 0.16, volume: 0.06 });
    },
    bawk: () => {
      tone({ type: 'sawtooth', from: 700, to: 1100, duration: 0.09, volume: 0.1 });
      tone({ type: 'sawtooth', from: 900, to: 600, duration: 0.14, delay: 0.1, volume: 0.1 });
    },
    mud: () => hiss({ duration: 0.25, volume: 0.22, from: 600, to: 200 }),
    smash: () => {
      hiss({ duration: 0.3, volume: 0.32, from: 1500, to: 200 });
      tone({ type: 'square', from: 140, to: 60, duration: 0.2, volume: 0.15 });
    },
    hurt: () => {
      hiss({ duration: 0.25, volume: 0.3, from: 1200, to: 300 });
      tone({ type: 'square', from: 560, to: 180, duration: 0.3, volume: 0.15 });
      gobble(0.05, 1.4);
    },
    hide: () => hiss({ duration: 0.35, volume: 0.3, type: 'bandpass', from: 2400, to: 700, q: 1.2 }),
    unhide: () => hiss({ duration: 0.2, volume: 0.2, type: 'bandpass', from: 900, to: 2400, q: 1.2 }),
    sneak: () => arpeggio([523, 659, 784, 1047], 'triangle', 0.06, 0.1, 0.15),
    spotted: () => tone({ type: 'square', from: 300, to: 900, duration: 0.2, volume: 0.18 }),
    poke: () => {
      tone({ type: 'square', from: 900, to: 300, duration: 0.12, volume: 0.15 });
      hiss({ duration: 0.2, volume: 0.25, from: 2000, to: 500 });
    },
    closeCall: () => tone({ type: 'sine', from: 1400, to: 2000, duration: 0.12, volume: 0.08 }),
    stage: () => arpeggio([392, 523, 659, 784, 1047], 'square', 0.08, 0.12, 0.1),
    escaped: () => {
      arpeggio([523, 659, 784, 1047, 784, 1047, 1319], 'square', 0.11, 0.16, 0.13);
      gobble(0.85);
    },
    caught: () => {
      [392, 370, 349, 311].forEach((frequency, index) => {
        tone({ type: 'sawtooth', from: frequency, to: index === 3 ? frequency * 0.85 : frequency, duration: index === 3 ? 0.8 : 0.3, delay: index * 0.32, volume: 0.14 });
      });
    },
    ovenWarn: () => {
      tone({ type: 'square', from: 110, to: 115, duration: 0.6, volume: 0.07 });
      hiss({ duration: 0.6, volume: 0.08, type: 'highpass', from: 3000 });
    },
    ovenBlast: () => hiss({ duration: 0.95, volume: 0.32, from: 250, to: 1600 }),
    geyser: () => hiss({ duration: 0.7, volume: 0.22, type: 'highpass', from: 1500, to: 4500 }),
    knifeThrow: () => {
      hiss({ duration: 0.3, volume: 0.2, type: 'highpass', from: 3000, to: 7000 });
      tone({ type: 'sine', from: 2600, to: 3400, duration: 0.3, volume: 0.05 });
    },
    warn: () => {
      tone({ type: 'square', from: 980, duration: 0.06, volume: 0.08 });
      tone({ type: 'square', from: 980, duration: 0.06, delay: 0.1, volume: 0.08 });
    },
    farmerWindup: () => tone({ type: 'sawtooth', from: 160, to: 260, duration: 0.35, volume: 0.12 }),
    whoosh: () => hiss({ duration: 0.25, volume: 0.18, type: 'bandpass', from: 400, to: 1200 }),
    tick: () => tone({ type: 'triangle', from: 1200, duration: 0.04, volume: 0.07 }),
    tock: () => tone({ type: 'triangle', from: 700, duration: 0.05, volume: 0.08 }),
    heartbeat: () => {
      tone({ type: 'sine', from: 72, to: 52, duration: 0.12, volume: 0.35 });
      tone({ type: 'sine', from: 66, to: 48, duration: 0.12, delay: 0.16, volume: 0.28 });
    },
  };

  function pluck(frequency, at, volume) {
    tone({ type: 'triangle', from: frequency, duration: 0.22, volume, at, bus: musicBus, attack: 0.003 });
    tone({ type: 'square', from: frequency * 2, duration: 0.07, volume: volume * 0.25, at, bus: musicBus, attack: 0.002 });
  }

  function scheduleStep(step, at) {
    const transpose = STAGE_TRANSPOSE[music.stage] ?? 0;
    if (MELODY[step]) pluck(noteFrequency(MELODY[step], transpose), at, 0.16);
    if (BASS[step]) tone({ type: 'triangle', from: noteFrequency(BASS[step], transpose), duration: 0.3, volume: 0.28, at, bus: musicBus });
    if (step % 4 === 0) tone({ type: 'sine', from: 140, to: 50, duration: 0.12, volume: 0.3, at, bus: musicBus });
    if (step % 4 === 2 || (music.intensity > 0.5 && step % 2 === 1)) {
      hiss({ duration: 0.04, volume: 0.06 + music.intensity * 0.05, type: 'highpass', from: 7000, at, bus: musicBus });
    }
    if (step % 8 === 4) hiss({ duration: 0.09, volume: 0.1, type: 'bandpass', from: 1800, q: 0.8, at, bus: musicBus });
  }

  function pump() {
    if (!context) return;
    const stepSeconds = 60 / (STAGE_TEMPO[music.stage] ?? 130) / 4;
    while (music.nextTime < context.currentTime + 0.12) {
      scheduleStep(music.step, music.nextTime);
      music.nextTime += stepSeconds;
      music.step = (music.step + 1) % MELODY.length;
    }
  }

  function runScheduler() {
    if (!context || music.timer !== null) return;
    music.nextTime = context.currentTime + 0.06;
    music.timer = setInterval(pump, 25);
  }

  function haltScheduler() {
    if (music.timer !== null) clearInterval(music.timer);
    music.timer = null;
  }

  function unlock() {
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.85;
      master.connect(context.destination);
      musicBus = context.createGain();
      musicBus.gain.value = 0.3;
      musicBus.connect(master);
      effectsBus = context.createGain();
      effectsBus.gain.value = 0.75;
      effectsBus.connect(master);
      noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
    }
    if (context.state === 'suspended') context.resume();
    if (music.wanted) runScheduler();
  }

  return {
    unlock,
    play(name) {
      SOUNDS[name]?.();
    },
    isMuted: () => muted,
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.85;
      saveMuted();
      return muted;
    },
    startMusic(stage = 0) {
      music.stage = stage;
      music.wanted = true;
      runScheduler();
    },
    stopMusic() {
      music.wanted = false;
      haltScheduler();
    },
    pauseMusic: haltScheduler,
    resumeMusic() {
      if (music.wanted) runScheduler();
    },
    setIntensity(level) {
      music.intensity = level;
    },
  };
}

export function noteFrequency(name, transpose = 0) {
  const match = /^([A-G]#?)(\d)$/.exec(name);
  if (!match) return 440;
  const midi = NOTE_INDEX[match[1]] + (Number(match[2]) + 1) * 12 + transpose;
  return 440 * 2 ** ((midi - 69) / 12);
}

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

const MUTE_KEY = 'not-on-the-menu.muted.v1';

const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

// One entry per sixteenth note: a C major pentatonic hoedown.
const MELODY = [
  'E5', null, 'G5', 'A5', null, 'G5', 'E5', null, 'D5', null, 'E5', 'G5', null, 'A5', 'C6', null,
  'A5', null, 'G5', 'E5', null, 'D5', 'C5', null, 'D5', null, 'E5', null, 'G5', 'E5', 'D5', null,
];

const BASS = [
  'C3', null, null, null, 'G2', null, null, null, 'A2', null, null, null, 'G2', null, null, null,
  'F2', null, null, null, 'C3', null, null, null, 'G2', null, null, null, 'G2', null, 'B2', null,
];

const STAGE_TEMPO = [124, 132, 140, 150];

const STAGE_TRANSPOSE = [0, 2, 3, 5];
