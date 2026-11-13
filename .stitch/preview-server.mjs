import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.stitch');
http.createServer((req, res) => {
  const name = path.basename(new URL(req.url, 'http://127.0.0.1').pathname);
  const file = path.join(root, name);
  if (!name.endsWith('.html') || !fs.existsSync(file)) {
    res.writeHead(404);
    res.end('missing');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(file).pipe(res);
}).listen(4174, '127.0.0.1', () => {
  process.stdout.write('preview 4174\n');
});
