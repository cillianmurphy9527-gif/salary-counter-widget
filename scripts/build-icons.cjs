'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');
const dir = path.join(__dirname, '..', 'assets');
const svg = fs.readFileSync(path.join(dir, 'logo.svg'), 'utf8');
function png(size) {
  const result = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render();
  if (result.width !== size || result.height !== size) throw Error('Invalid rendered dimensions');
  return Buffer.from(result.asPng());
}
fs.writeFileSync(path.join(dir, 'icon.png'), png(1024));
fs.writeFileSync(path.join(dir, 'tray.png'), png(64));
const sizes = [16, 24, 32, 48, 64, 128, 256], images = sizes.map(png);
const ico = Buffer.alloc(6 + 16 * sizes.length);
ico.writeUInt16LE(1, 2); ico.writeUInt16LE(sizes.length, 4);
let offset = ico.length;
sizes.forEach((size, index) => {
  const p = 6 + index * 16;
  ico[p] = ico[p + 1] = size === 256 ? 0 : size;
  ico.writeUInt16LE(1, p + 4); ico.writeUInt16LE(32, p + 6);
  ico.writeUInt32LE(images[index].length, p + 8); ico.writeUInt32LE(offset, p + 12);
  offset += images[index].length;
});
fs.writeFileSync(path.join(dir, 'icon.ico'), Buffer.concat([ico, ...images]));
const chunks = [['icp4', 16], ['icp5', 32], ['icp6', 64], ['ic07', 128], ['ic08', 256], ['ic09', 512], ['ic10', 1024]].map(([type, size]) => {
  const data = png(size), header = Buffer.alloc(8);
  header.write(type, 0, 'ascii'); header.writeUInt32BE(data.length + 8, 4);
  return Buffer.concat([header, data]);
});
const header = Buffer.alloc(8); header.write('icns');
header.writeUInt32BE(8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0), 4);
fs.writeFileSync(path.join(dir, 'icon.icns'), Buffer.concat([header, ...chunks]));
console.log('BRAND_ICONS_OK', sizes.join(','), 'PNG/ICO/ICNS');
