import fs from 'node:fs';
const file='index.html';
let h=fs.readFileSync(file,'utf8');
if(h.includes('WIDGET_313_READY')) process.exit(0);
function rep(a,b){if(!h.includes(a))throw Error('missing '+a.slice(0,120));h=h.replace(a,b);}
rep('</style></head>',String.raw`
/* WIDGET_313_READY */
body.settings-only{background:#101827!important}
body.settings-only #viewport{display:none!important}
body.settings-only #miniPanel{display:none!important}
body.settings-only #modal{position:fixed;inset:0;max-width:none;border:none;border-radius:0;box-shadow:none;backdrop-filter:none;background:#101827}
body.settings-only .modal-head{padding:16px 20px 13px;flex-shrink:0}
body.settings-only .modal-head h2{font-size:22px}
body.settings-only .modal-head p{font-size:12px}
body.settings-only .iconbtn{width:32px;height:32px;border-radius:9px;font-size:20px}
body.settings-only .modal-scroll{padding:14px 16px;min-height:0}
body.settings-only fieldset{padding:13px;margin-bottom:12px;border-radius:12px}
body.settings-only legend{font-size:15px}
body.settings-only .settings-grid{gap:12px}
body.settings-only label.field{font-size:13px}
body.settings-only label.field input,body.settings-only label.field select,body.settings-only label.field textarea{font-size:14px;padding:8px}
body.settings-only .week-checks label{padding:6px 8px;font-size:12px}
body.settings-only .modal-foot{padding:12px;gap:6px;flex-wrap:wrap;flex-shrink:0}
body.settings-only .foot-right{gap:6px}
body.settings-only .action{font-size:12px;padding:8px 10px;border-radius:8px}
body.settings-only #toast{position:fixed;left:50%;top:auto;bottom:65px;max-width:90%;font-size:13px;white-space:normal}
#widgetResize{display:none;position:fixed;bottom:2px;left:2px;width:23px;height:23px;z-index:50;border:0;border-radius:0 6px 0 8px;color:#f2d5a1;background:transparent;cursor:nesw-resize;touch-action:none;opacity:.5;font-size:16px;line-height:20px}
body.electron.compact:not(.settings-only) #widgetResize{display:block}
#widgetResize:hover,#widgetResize:focus-visible{opacity:1;background:#20324a}
body.electron:not(.settings-only) #pin[aria-pressed=true]{background:#60edaa25;box-shadow:inset 0 0 0 2px #80efba}
body.electron:not(.settings-only) #toast{top:auto;bottom:12px;position:fixed;z-index:60;max-width:95%;white-space:normal}
</style></head>`);
rep("    setAlwaysOnTop: value => invoke('set_always_on_top', { value: Boolean(value) }),","    setAlwaysOnTop: value => invoke('set_always_on_top', { value: Boolean(value) }),\n    getDesktopPrefs: () => invoke('get_desktop_prefs'),\n    setWidgetWidth: value => invoke('set_widget_width', { value: Number(value) }),\n    showSettings: () => invoke('show_settings'),\n    closeSettings: () => invoke('close_settings'),\n    listen: (name, handler) => api.event.listen(name, event => handler(event.payload)),");
rep('alwaysOnTop:true,widgetEnabled:true','alwaysOnTop:false,widgetWidth:520,widgetEnabled:true');
rep('<legend>桌面行为</legend><div class="settings-grid">','<legend>桌面行为</legend><div class="settings-grid"><label class="field">组件宽度（逻辑像素）<input id="setWidth" type="number" min="320" max="1060" step="1" value="520"></label><label style="display:flex;align-items:center;gap:10px"><input id="setPinned" type="checkbox"> 始终置顶</label>');
rep("$('setWidgetEnabled').checked=cfg.widgetEnabled!==false;","$('setWidgetEnabled').checked=cfg.widgetEnabled!==false;$('setPinned').checked=!!cfg.alwaysOnTop;$('setWidth').value=cfg.widgetWidth||520;");
rep('alwaysOnTop:true,widgetEnabled:',"alwaysOnTop:$('setPinned').checked,widgetWidth:Math.round(Math.min(1060,Math.max(320,Number($('setWidth').value)||520))),widgetEnabled:");
rep("await window.salaryApp.saveConfig(cfg);await window.salaryApp.setWidgetEnabled(cfg.widgetEnabled);await window.salaryApp.setLoginItem(cfg.autoStart)","await window.salaryApp.setAlwaysOnTop(v.alwaysOnTop);await window.salaryApp.setWidgetWidth(v.widgetWidth);await window.salaryApp.setWidgetEnabled(v.widgetEnabled);await window.salaryApp.setLoginItem(v.autoStart);await window.salaryApp.saveConfig(cfg)");
rep("catch(e){toast('保存时发生错误：'+e.message)}closeModal();render()","catch(e){toast('保存时发生错误：'+e.message);return}closeModal();render()");
rep("function closeModal(){$('modal').classList.remove('show')}","function closeModal(){if(window.__salarySettings&&window.salaryApp){window.salaryApp.closeSettings();return}$('modal').classList.remove('show')}");
rep("$('gear').onclick=async()=>{if(window.salaryApp&&compact){await window.salaryApp.setCompact(false);setTimeout(openModal,180)}else openModal()};","$('gear').onclick=async()=>{if(window.salaryApp){try{await window.salaryApp.showSettings()}catch(e){toast(String(e))}}else openModal()};");
const pinStart=h.indexOf("$('pin').onclick=async()=>");
const pinEnd=h.indexOf("\n$('minus').onclick=",pinStart);
if(pinStart<0||pinEnd<0)throw Error('pin marker');
h=h.slice(0,pinStart)+"$('pin').onclick=async()=>{const value=!cfg.alwaysOnTop;try{if(window.salaryApp){await window.salaryApp.setAlwaysOnTop(value)}else localStorage.setItem('salary-widget-v2',JSON.stringify({...cfg,alwaysOnTop:value}));cfg.alwaysOnTop=value;syncPin();toast(value?'已开启置顶显示':'已取消置顶，固定在桌面')}catch(e){toast(String(e))}};"+h.slice(pinEnd);
const minusStart=h.indexOf("$('minus').onclick=");
const minusEnd=h.indexOf("\n$('quit').onclick=",minusStart);
if(minusStart<0||minusEnd<0)throw Error('minus marker');
h=h.slice(0,minusStart)+"$('minus').onclick=async()=>{if(window.salaryApp){try{await window.salaryApp.hide()}catch(e){toast(String(e))}}else toast('桌面版支持收起到系统托盘')};"+h.slice(minusEnd);
rep("const params=new URLSearchParams(location.search);","if(window.salaryApp?.getDesktopPrefs){try{Object.assign(cfg,await window.salaryApp.getDesktopPrefs())}catch(e){console.warn(e)}}syncPin();if(window.__salarySettings){document.body.classList.add('settings-only');document.body.append($('modal'),$('toast'));openModal()}const params=new URLSearchParams(location.search);");
rep("window.addEventListener('resize',resize);init();",String.raw`
window.addEventListener('resize',resize);
function syncPin(){ $('pin').setAttribute('aria-pressed',String(!!cfg.alwaysOnTop));$('pin').title=cfg.alwaysOnTop?'取消置顶':'开启置顶'; }
async function refreshSettings(){try{cfg=merge(await window.salaryApp.loadConfig());Object.assign(cfg,await window.salaryApp.getDesktopPrefs());formFill();openModal()}catch(e){toast(String(e))}}
async function boot313(){
  await init();
  if(window.salaryApp?.listen){
    await window.salaryApp.listen('desktop-preferences',prefs=>{if(!window.__salarySettings){Object.assign(cfg,prefs);syncPin()}});
    await window.salaryApp.listen('settings-updated',value=>{if(!window.__salarySettings){const prefs={widgetEnabled:cfg.widgetEnabled,widgetWidth:cfg.widgetWidth,alwaysOnTop:cfg.alwaysOnTop};cfg=merge({...value,...prefs});render()}});
    if(window.__salarySettings) await window.salaryApp.listen('settings-opened',refreshSettings);
  }
  if(window.__salarySettings)return;
  document.body.append($('toast'));
  const grip=document.createElement('button');grip.id='widgetResize';grip.textContent='◣';grip.title='向左拖动放大，向右拖动缩小';grip.setAttribute('aria-label','拖动调整组件大小');document.body.append(grip);
  let start=null;
  grip.addEventListener('pointerdown',e=>{if(!window.salaryApp)return;start={x:e.screenX,width:innerWidth};grip.setPointerCapture(e.pointerId);e.preventDefault()});
  grip.addEventListener('pointermove',e=>{if(start){const mn=cfg.widgetMinWidth||220,mx=cfg.widgetMaxWidth||1060;grip.title=Math.round(Math.min(mx,Math.max(mn,start.width+start.x-e.screenX)))+' px · 松开应用'}});
  grip.addEventListener('pointerup',async e=>{if(!start)return;const width=start.width+start.x-e.screenX;start=null;grip.title='向左拖动放大，向右拖动缩小';try{await window.salaryApp.setWidgetWidth(width)}catch(err){toast(String(err))}});
  grip.addEventListener('pointercancel',()=>{start=null});
  grip.addEventListener('keydown',async e=>{if(!window.salaryApp||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();await window.salaryApp.setWidgetWidth(innerWidth+(e.key==='ArrowLeft'?40:-40))});
}
boot313();
`);
fs.writeFileSync(file,h);
console.log('WIDGET_313_PATCHED');
