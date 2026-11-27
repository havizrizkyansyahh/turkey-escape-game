// Not On The Menu! — the hand-in program for make.fun's turkey-run-game-01 bounty.
//
// Node 22+, standard library only. It copies the playable game (game/) and its screenshots
// (screenshots/) into the output folder, then writes dossier.json with the kit's buildDossier,
// so the judge reads exactly the files that ship. Nothing here touches the network.
//
//   Local run:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//   Grader:     the output folder is /output

import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's limits, mirrored here so a broken hand-in fails loudly before it reaches the gate.
const DOSSIER_CAPS = {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: 262_144 },
  game_max_files: 993,
  game_max_bytes: 50_331_648,
  game_path_max_bytes: 1_000,
};

function requireFile(path: string, what: string): void {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`Not On The Menu! hand-in: missing ${what} at ${path}`);
  }
}

// The gate's rule for a screenshot's file name: letters, digits and . _ - (1 to 128 characters),
// not starting with . or -.
const SCREENSHOT_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

// Screenshot files in name order: the first one is the cover the judge sees large.
function screenshotNames(folder: string): string[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((name) => !name.startsWith('.') && /\.(png|jpe?g)$/i.test(name))
    .sort();
}

function checkScreenshots(folder: string, names: string[]): void {
  if (names.length < 3 || names.length > 4) {
    throw new Error(`Not On The Menu! hand-in: screenshots/ needs 3 or 4 images, found ${names.length}`);
  }
  for (const name of names) {
    if (!SCREENSHOT_NAME.test(name)) throw new Error(`Not On The Menu! hand-in: screenshot name not allowed by the gate: ${name}`);
    const bytes = statSync(join(folder, name)).size;
    if (bytes > DOSSIER_CAPS.screenshots.max_bytes) {
      throw new Error(`Not On The Menu! hand-in: ${name} is ${bytes} bytes, over the ${DOSSIER_CAPS.screenshots.max_bytes}-byte cap`);
    }
  }
}

function handIn(): void {
  requireFile(join(REPO_ROOT, 'game', 'index.html'), 'the game page');
  const shots = screenshotNames(join(REPO_ROOT, 'screenshots'));
  checkScreenshots(join(REPO_ROOT, 'screenshots'), shots);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  cpSync(join(REPO_ROOT, 'game'), join(OUTPUT_DIR, 'game'), { recursive: true });

  const shotsOut = join(OUTPUT_DIR, 'screenshots');
  mkdirSync(shotsOut, { recursive: true });
  for (const name of shots) copyFileSync(join(REPO_ROOT, 'screenshots', name), join(shotsOut, name));

  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), buildDossier(OUTPUT_DIR, DOSSIER_CAPS));
}

handIn();
