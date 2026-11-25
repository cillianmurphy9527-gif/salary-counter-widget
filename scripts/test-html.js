'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
assert.ok(html.length > 8_000_000, '完整原始界面文件缺失或被截断');
for (const id of ['countdown','earned','daily','monthlyNet','gear','modal','setNet','save','salaryClick','monthClick','setWidgetEnabled','miniPanel']) {
  assert.ok(html.includes('id="' + id + '"'), '缺少原版 UI 元素: ' + id);
}
assert.ok(html.includes('window.salaryApp = Object.freeze'), 'Tauri 桌面桥接接口缺失');
for (const marker of ['removeWidget','setWidgetEnabled','getWidgetEnabled','getWindowMode','showFull','window-mode','setWidgetWidth','showSettings','getDesktopPrefs']) {
  assert.ok(html.includes(marker), '缺少桌面组件控制接口: ' + marker);
}
assert.ok(html.includes('let ref={x:164,y:30,w:1060,h:1068}'), '原设计面板裁切尺寸错误');
assert.ok(html.includes('body.electron #miniPanel{display:none!important}'), '桌面版仍显示旧版简化小组件');
assert.ok(html.includes('body.electron #viewport{display:block!important'), '桌面版没有显示完整原版设计图');
assert.ok(html.includes('#drag{display:none!important'), '桌面窗口仍包含拖动区域');
assert.ok(html.includes('widgetEnabled:true'), '首次启动没有默认启用桌面组件');
assert.ok((html.match(/data:image\/png;base64,/g) || []).length >= 4, '内嵌视觉素材不完整');
assert.ok(!/<script[^>]+src=["']https?:\/\//i.test(html), '发现外部脚本依赖');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(Boolean);
for (let i = 0; i < scripts.length; i++) new vm.Script(scripts[i], { filename: 'inline-' + i + '.js' });
console.log('HTML_SOURCE_OK', JSON.stringify({ characters: html.length, embeddedImages: (html.match(/data:image\/png;base64,/g)||[]).length, inlineScripts: scripts.length }));
