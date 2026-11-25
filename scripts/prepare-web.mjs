import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const out = path.join(root, 'web');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(out, 'index.html'));
fs.writeFileSync(path.join(out,'settings.html'), fs.readFileSync(path.join(root,'index.html'),'utf8').replace('<head>','<head><script>window.__salarySettings=true;</script>').replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/g,'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4ioAAAAASUVORK5CYII=')); 
for (const name of ['logo.svg', 'icon.png']) {
  fs.copyFileSync(path.join(root, 'assets', name), path.join(out, 'assets', name));
}
const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
if (!html.includes('window.salaryApp = Object.freeze') || !html.includes('removeWidget')) throw new Error('Tauri bridge missing from packaged UI');
console.log('WEB_DIST_READY', JSON.stringify({ htmlBytes: Buffer.byteLength(html), assets: ['logo.svg','icon.png'] }));
