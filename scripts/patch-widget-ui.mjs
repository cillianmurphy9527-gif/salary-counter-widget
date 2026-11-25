import fs from 'node:fs';

const file = 'index.html';
let html = fs.readFileSync(file, 'utf8');
if (html.includes('window.salaryApp = Object.freeze')) {
  console.log('WIDGET_UI_ALREADY_PATCHED');
  process.exit(0);
}

function replaceOnce(source, search, replacement, label) {
  const index = source.indexOf(search);
  if (index < 0) throw new Error('Cannot patch ' + label + ': source marker not found');
  return source.slice(0, index) + replacement + source.slice(index + search.length);
}

// Reuse the original complete panel artwork and live-data overlay.
// The widget is only a transparent crop + proportional scale of that exact panel.
const css = [
  '/* V3.1.2: original full panel scaled into a compact, transparent desktop widget. */',
  'html,body{width:100%;height:100%;min-width:0;min-height:0;margin:0;padding:0;overflow:hidden;background:transparent!important}',
  'body.electron{background:transparent!important}',
  'body.electron #viewport{display:block!important;position:absolute;left:0!important;top:0!important;overflow:hidden!important}',
  'body.electron #miniPanel{display:none!important}',
  'body.electron #drag,body.electron .mini-drag{display:none!important;-webkit-app-region:no-drag!important}',
  'body.electron #toast{left:50%;top:1050px;max-width:90%;font-size:13px;padding:7px 11px}',
  '#drag{display:none!important;-webkit-app-region:no-drag!important}'
].join('\n');
html = replaceOnce(html, '</style></head>', css + '</style></head>', 'transparent widget CSS');

const bridge = [
  '<script>',
  '(() => {',
  '  const api = window.__TAURI__;',
  '  if (!api?.core?.invoke) return;',
  '  const invoke = api.core.invoke;',
  '  window.salaryApp = Object.freeze({',
  "    loadConfig: () => invoke('settings_load'),",
  "    saveConfig: value => invoke('settings_save', { value }),",
  "    setAlwaysOnTop: value => invoke('set_always_on_top', { value: Boolean(value) }),",
  "    setLoginItem: value => invoke('set_login_item', { value: Boolean(value) }),",
  "    setCompact: value => invoke('set_window_mode', { widget: Boolean(value) }),",
  "    setWidgetEnabled: value => invoke('set_widget_enabled', { enabled: Boolean(value) }),",
  "    hide: () => invoke('hide_window'),",
  "    removeWidget: () => invoke('remove_widget'),",
  "    showWidget: () => invoke('show_widget'),",
  "    showFull: () => invoke('show_full'),",
  "    getWindowMode: () => invoke('get_window_mode'),",
  "    getWidgetEnabled: () => invoke('get_widget_enabled'),",
  '    onCompact: handler => {',
  '      let disposed = false, unlisten = null;',
  "      api.event.listen('window-mode', event => { if (!disposed) handler(event.payload === 'widget'); })",
  '        .then(stop => { if (disposed) stop(); else unlisten = stop; });',
  '      return () => { disposed = true; if (unlisten) unlisten(); };',
  '    }',
  '  });',
  '})();',
  '</script>',
  ''
].join('\n');
html = replaceOnce(html, "<script>\n'use strict';", bridge + "<script>\n'use strict';", 'Tauri bridge');

// Store the user's choice to show/remove the desktop widget.
html = replaceOnce(
  html,
  "alwaysOnTop:true,autoStart:false,timezone:'Asia/Shanghai'",
  "alwaysOnTop:true,widgetEnabled:true,autoStart:false,timezone:'Asia/Shanghai'",
  'default widget state'
);
html = replaceOnce(
  html,
  '<label style="display:flex;align-items:center;gap:10px"><input id="setPinned" type="checkbox"> 始终置顶</label>',
  '<label style="display:flex;align-items:center;gap:10px"><input id="setWidgetEnabled" type="checkbox"> 显示桌面小组件</label>',
  'widget visibility setting'
);
html = replaceOnce(html, "$('setPinned').checked=cfg.alwaysOnTop;", "$('setWidgetEnabled').checked=cfg.widgetEnabled!==false;", 'widget visibility form binding');
html = replaceOnce(
  html,
  "alwaysOnTop:$('setPinned').checked,autoStart:$('setAutoStart').checked",
  "alwaysOnTop:true,widgetEnabled:$('setWidgetEnabled').checked,autoStart:$('setAutoStart').checked",
  'widget visibility save binding'
);
html = replaceOnce(html, 'await window.salaryApp.setAlwaysOnTop(cfg.alwaysOnTop);', 'await window.salaryApp.setWidgetEnabled(cfg.widgetEnabled);', 'widget visibility persistence');

// Crop to the complete transparent artwork, including the cat and sleep symbols
// (x=164..1224, y=30..1098), removing the
// original screenshot's surrounding desktop/background margins.
const resizeStart = html.indexOf('function resize(){');
const resizeEnd = html.indexOf('\nfunction toast', resizeStart);
if (resizeStart < 0 || resizeEnd < 0) throw new Error('Cannot locate resize()');
const resize = "function resize(){let d=window.salaryApp,ww=window.innerWidth,hh=window.innerHeight,scale,x,y,w,h;if(d){let ref={x:164,y:30,w:1060,h:1068};scale=Math.min(ww/ref.w,hh/ref.h);x=-ref.x*scale;y=-ref.y*scale;w=ref.w*scale;h=ref.h*scale}else{scale=Math.min(1,ww/1254,hh/1254);x=0;y=0;w=1254*scale;h=1254*scale}let vp=$('viewport');vp.style.left=d?'0px':Math.max(0,(ww-w)/2)+'px';vp.style.top=d?'0px':Math.max(0,(hh-h)/2)+'px';vp.style.width=w+'px';vp.style.height=h+'px';$('stage').style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';}";
html = html.slice(0, resizeStart) + resize + html.slice(resizeEnd);

// Restore the saved native mode and react to tray-menu mode changes.
const oldInit = "if(window.salaryApp){window.salaryApp.onCompact(value=>{compact=!!value;document.body.classList.toggle('compact',compact);resize()});try{cfg=merge(await window.salaryApp.loadConfig())}catch(e){cfg=merge(null)}}else{try{cfg=merge(JSON.parse(localStorage.getItem('salary-widget-v2')||'null'))}catch(e){cfg=merge(null)}}";
const newInit = "if(window.salaryApp){window.salaryApp.onCompact(value=>{compact=!!value;document.body.classList.toggle('compact',compact);resize()});try{cfg=merge(await window.salaryApp.loadConfig());compact=(await window.salaryApp.getWindowMode())==='widget';cfg.widgetEnabled=await window.salaryApp.getWidgetEnabled();document.body.classList.toggle('compact',compact)}catch(e){cfg=merge(null)}}else{try{cfg=merge(JSON.parse(localStorage.getItem('salary-widget-v2')||'null'))}catch(e){cfg=merge(null)}}";
html = replaceOnce(html, oldInit, newInit, 'initial native window mode');

// The widget remains compact; settings and detailed views expand to the full panel.
html = replaceOnce(
  html,
  "$('gear').onclick=openModal;",
  "$('gear').onclick=async()=>{if(window.salaryApp&&compact){await window.salaryApp.setCompact(false);setTimeout(openModal,180)}else openModal()};",
  'widget settings expansion'
);
html = replaceOnce(
  html,
  "$('pin').onclick=async()=>{cfg.alwaysOnTop=!cfg.alwaysOnTop;if(window.salaryApp){await window.salaryApp.setAlwaysOnTop(cfg.alwaysOnTop);await window.salaryApp.saveConfig(cfg)}else localStorage.setItem('salary-widget-v2',JSON.stringify(cfg));toast(cfg.alwaysOnTop?'已开启置顶':'已关闭置顶')};",
  "$('pin').onclick=async()=>{if(window.salaryApp&&compact){toast('桌面小组件固定在右上角，不能移动或取消置顶');return}cfg.alwaysOnTop=!cfg.alwaysOnTop;if(window.salaryApp){await window.salaryApp.setAlwaysOnTop(cfg.alwaysOnTop);await window.salaryApp.saveConfig(cfg)}else localStorage.setItem('salary-widget-v2',JSON.stringify(cfg));toast(cfg.alwaysOnTop?'已开启置顶':'已关闭置顶')};",
  'fixed widget pin behavior'
);
html = replaceOnce(
  html,
  "$('quit').onclick=()=>{if(window.salaryApp)window.salaryApp.hide();else toast('浏览器预览：请关闭本标签页')};$('salaryClick').onclick=()=>showDetail('salary');$('monthClick').onclick=()=>showDetail('month');",
  "$('quit').onclick=()=>{if(window.salaryApp)window.salaryApp.removeWidget();else toast('浏览器预览：请关闭本标签页')};$('salaryClick').onclick=()=>showDetail('salary');$('monthClick').onclick=()=>showDetail('month');",
  'widget close and details behavior'
);
html = replaceOnce(
  html,
  "$('miniClose').onclick=()=>{if(window.salaryApp)window.salaryApp.hide();else document.body.classList.remove('compact')};",
  "$('miniClose').onclick=()=>{if(window.salaryApp)window.salaryApp.removeWidget();else document.body.classList.remove('compact')};",
  'legacy mini close behavior'
);
html = html.replace("document.addEventListener('dblclick',e=>{if(!window.salaryApp)return;if(e.clientY<100&&!$('modal').classList.contains('show'))$('minus').click()});", '');

fs.writeFileSync(file, html, 'utf8');
console.log('ORIGINAL_PANEL_WIDGET_READY', JSON.stringify({
  bytes: Buffer.byteLength(html),
  widget: '420x423',
  crop: 'x=164,y=30,w=1060,h=1068',
  originalDesignPreserved: true,
  allOriginalMetricsPreserved: true,
  transparentEdges: true,
  draggable: false
}));
