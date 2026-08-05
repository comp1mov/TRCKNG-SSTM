import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2]) || 5173;
const hostArg = process.argv[3];
const host = hostArg === '--lan' ? '0.0.0.0' : (hostArg || '127.0.0.1');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl, `http://${host}:${port}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === '/' || pathname === '/TRCKNG-SSTM/') {
    pathname = '/index.html';
  }

  pathname = pathname.replace(/^\/TRCKNG-SSTM\//, '/');
  const resolved = path.normalize(path.join(root, pathname));

  if (!resolved.startsWith(root)) {
    return null;
  }

  return resolved;
}

const server = http.createServer((request, response) => {
  const filePath = resolveRequestPath(request.url);

  if (!filePath) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
    });
    response.end(data);
  });
});

server.listen(port, host, () => {
  const localHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  console.log(`TRCKNG SSTM running at http://${localHost}:${port}/TRCKNG-SSTM/`);

  if (host === '0.0.0.0') {
    const interfaces = os.networkInterfaces();
    Object.values(interfaces)
      .flat()
      .filter(address => address && address.family === 'IPv4' && !address.internal)
      .forEach(address => {
        console.log(`LAN preview: http://${address.address}:${port}/TRCKNG-SSTM/`);
      });
  }
});
