import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 4173;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (urlPath === '/') urlPath = '/Prototype/';
    let file = path.resolve(root, '.' + urlPath);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const allowed = ['Prototype', 'Assets', 'Art/Source', 'Art/Previews', 'Art/AnimationWork'].map(dir => path.resolve(root, dir));
    if (!allowed.some(dir => file === dir || file.startsWith(dir + path.sep))) { res.writeHead(403); res.end('이 경로는 제공되지 않습니다.'); return; }
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('파일을 찾을 수 없습니다.'); }
});
server.listen(port, '127.0.0.1', () => console.log(`이끼송곳니 거점: http://127.0.0.1:${port}/Prototype/`));
