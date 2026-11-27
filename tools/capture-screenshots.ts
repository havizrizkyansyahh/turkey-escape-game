// Takes the game's screenshots with headless Chrome. It serves game/ locally, loads each scene in
// shots.json (the game stages that exact scene from ?shot= and freezes it), saves a PNG, converts
// it to JPEG with macOS sips and checks the gate's limits: at most 256 KiB, long side at most
// 1280 px, short side at least 480 px.
//
//   node tools/capture-screenshots.ts                                   → screenshots/ from shots.json
//   node tools/capture-screenshots.ts --out /tmp/look barn.png='?shot=barn&seed=4'

import { execFile, execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { startGameServer } from '../serve.ts';

const run = promisify(execFile);

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8123;
const WIDTH = 1280;
const HEIGHT = 800;
const MAX_BYTES = 256 * 1024;

type Shot = { name: string; query: string };

function parseArgs(argv: string[]): { out: string; shots: Shot[] } {
  let out = join(REPO_ROOT, 'screenshots');
  const shots: Shot[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') {
      out = resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    const split = argv[i].indexOf('=');
    if (split > 0) shots.push({ name: argv[i].slice(0, split), query: argv[i].slice(split + 1) });
  }
  if (shots.length === 0) shots.push(...(JSON.parse(readFileSync(join(REPO_ROOT, 'shots.json'), 'utf8')) as Shot[]));
  return { out, shots };
}

function imageSize(file: string): { width: number; height: number } {
  const report = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
  return {
    width: Number(/pixelWidth: (\d+)/.exec(report)?.[1] ?? 0),
    height: Number(/pixelHeight: (\d+)/.exec(report)?.[1] ?? 0),
  };
}

// Chrome runs asynchronously: the game server lives in this same process and must keep answering.
async function captureWithChrome(url: string, png: string, profile: string): Promise<void> {
  await run(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profile}`,
      '--force-device-scale-factor=1',
      `--window-size=${WIDTH},${HEIGHT}`,
      '--virtual-time-budget=2000',
      `--screenshot=${png}`,
      url,
    ],
    { timeout: 60_000 },
  );
}

// Tries falling JPEG qualities until the file fits the gate's 256 KiB.
function convertToJpeg(png: string, jpg: string): number {
  for (const quality of [88, 82, 76, 70, 62]) {
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(quality), png, '--out', jpg], { stdio: 'pipe' });
    if (statSync(jpg).size <= MAX_BYTES) return quality;
  }
  throw new Error(`${jpg} stays over ${MAX_BYTES} bytes even at quality 62`);
}

const { out, shots } = parseArgs(process.argv.slice(2));
mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'not-on-the-menu-shots-'));
const server = await startGameServer(PORT);
try {
  for (const shot of shots) {
    const png = join(work, `${shot.name.replace(/\.(png|jpe?g)$/i, '')}.png`);
    await captureWithChrome(`http://127.0.0.1:${PORT}/${shot.query}`, png, join(work, 'chrome-profile'));
    const { width, height } = imageSize(png);
    if (Math.max(width, height) > 1280 || Math.min(width, height) < 480) {
      throw new Error(`${shot.name}: ${width}x${height} is outside the gate's size limits`);
    }
    const target = join(out, shot.name);
    if (/\.jpe?g$/i.test(shot.name)) {
      const quality = convertToJpeg(png, target);
      console.log(`${shot.name}: ${width}x${height}, ${statSync(target).size} bytes, JPEG quality ${quality}`);
    } else {
      copyFileSync(png, target);
      console.log(`${shot.name}: ${width}x${height}, ${statSync(target).size} bytes, PNG`);
    }
  }
} finally {
  server.close();
  rmSync(work, { recursive: true, force: true });
}
