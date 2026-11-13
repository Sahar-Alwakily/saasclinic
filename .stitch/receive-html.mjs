import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.stitch');
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  const name = new URL(req.url, 'http://127.0.0.1').searchParams.get('name') || '';
  if (!/^[a-z0-9-]+$/.test(name)) {
    res.writeHead(400);
    res.end('bad name');
    return;
  }
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const file = path.join(root, `${name}.html`);
    fs.writeFileSync(file, Buffer.concat(chunks));
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(String(Buffer.concat(chunks).length));
  });
});
server.listen(8765, '127.0.0.1', () => {
  process.stdout.write('listening 8765\n');
});
