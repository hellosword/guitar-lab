import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve('dist');
const devDataPath = resolve(projectRoot, '.dev/practice-data.json');
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

function readRequestBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];

    request.on('data', (chunk) => {
      chunks.push(chunk);
    });

    request.on('end', () => {
      resolveBody(Buffer.concat(chunks).toString('utf8'));
    });

    request.on('error', rejectBody);
  });
}

async function handleDevPracticeData(request, response) {
  if (request.method === 'GET') {
    if (!existsSync(devDataPath)) {
      response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'practice data not found' }));
      return;
    }

    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    response.end(readFileSync(devDataPath, 'utf8'));
    return;
  }

  if (request.method === 'POST') {
    const body = await readRequestBody(request);
    JSON.parse(body);
    mkdirSync(dirname(devDataPath), { recursive: true });
    writeFileSync(devDataPath, `${body}\n`, 'utf8');
    response.writeHead(204);
    response.end();
    return;
  }

  response.writeHead(405, { allow: 'GET, POST' });
  response.end('Method not allowed');
}

export function createStaticServer() {
  return createServer((request, response) => {
    if ((request.url ?? '').startsWith('/__dev/practice-data')) {
      handleDevPracticeData(request, response).catch((error) => {
        response.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ error: error.message }));
      });
      return;
    }

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
