import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const sourceDir = path.join(root, 'source');
const parts = fs.readdirSync(sourceDir).filter(name => /^index\.html\.part-\d{2}$/.test(name)).sort();
if (parts.length < 5) throw new Error('HTML 源文件分片不足');
const html = parts.map(name => fs.readFileSync(path.join(sourceDir, name), 'utf8')).join('');
if (html.length < 8_000_000 || !html.startsWith('<!DOCTYPE html>') || !html.includes('function calc(')) {
  throw new Error('HTML 源文件合并校验失败：' + html.length);
}
fs.writeFileSync(path.join(root, 'index.html'), html, 'utf8');
console.log('HTML_ASSEMBLED', JSON.stringify({ parts: parts.length, characters: html.length, bytes: Buffer.byteLength(html) }));
