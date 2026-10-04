// Zero-dependency HTTP server. createServer() is exported so tests can bind port 0.
import http from 'node:http';
import { readFileSync } from 'node:fs';

const home = () => readFileSync(new URL('../public/index.html', import.meta.url));

export function createServer() {
  return http.createServer((req, res) => {
    if (req.url === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"ok":true}'); }
    if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(home()); }
    res.writeHead(404); res.end('not found');
  });
}

if (process.argv[1]?.endsWith('server.mjs')) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, () => console.log(`listening on http://localhost:${port}`));
}
