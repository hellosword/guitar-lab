import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve('dist');
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? '127.0.0.1';

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

function resolveRequestPath(url) {
  const requestPath = decodeURIComponent(new URL(url, `http://${host}:${port}`).pathname);
  const normalizedPath = normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = resolve(join(root, normalizedPath === sep ? 'index.html' : normalizedPath));

  if (!filePath.startsWith(root)) {
    return null;
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    return filePath;
  }

  return join(root, 'index.html');
}

export function createStaticServer() {
  return createServer((request, response) => {
    const filePath = resolveRequestPath(request.url ?? '/');

    if (filePath === null || !existsSync(filePath)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'content-type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
    });
    createReadStream(filePath).pipe(response);
  });
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (!existsSync(root)) {
    console.error('dist 目录不存在，请先运行 npm run build');
    process.exit(1);
  }

  const server = createStaticServer();
  server.listen(port, host, () => {
    console.log(`Guitar Lab static preview: http://${host}:${port}`);
  });
}
