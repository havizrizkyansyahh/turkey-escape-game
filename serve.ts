// Local play-test server for game/ (Node 22+, standard library only).
//
//   node serve.ts              → http://localhost:8080
//   node serve.ts --port 9000  → http://localhost:9000
//
// It serves only files inside game/, never caches (a reload always shows the latest edit) and
// listens on 127.0.0.1 alone: a development convenience, not a server for the internet.

import { createReadStream, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME_ROOT = resolve(fileURLToPath(new URL('./game', import.meta.url)));

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Maps a request path to a file under game/, or null when it is missing or climbs out of game/.
function gameFileFor(urlPath: string): string | null {
  let pathname: string;
  try {
    pathname = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(GAME_ROOT, `.${pathname}`);
  if (file !== GAME_ROOT && !file.startsWith(GAME_ROOT + sep)) return null;
  try {
    return statSync(file).isFile() ? file : null;
  } catch {
    return null;
  }
}

export function startGameServer(port = 8080): Promise<Server> {
  const server = createServer((request, response) => {
    const file = gameFileFor(new URL(request.url ?? '/', 'http://localhost').pathname);
    if (!file) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found');
      return;
    }
    response.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(response);
  });
  return new Promise((ready) => server.listen(port, '127.0.0.1', () => ready(server)));
}

const launchedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (launchedDirectly) {
  const flag = process.argv.indexOf('--port');
  const asked = flag === -1 ? 8080 : Number(process.argv[flag + 1]);
  const port = Number.isInteger(asked) && asked > 0 && asked < 65536 ? asked : 8080;
  startGameServer(port).then(() => console.log(`Not On The Menu! is on http://localhost:${port}`));
}
