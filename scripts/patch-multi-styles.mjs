import fs from 'node:fs';

const file = 'index.html';
let html = fs.readFileSync(file, 'utf8');
if (html.includes('MULTI_STYLE_316_READY')) {
  console.log('MULTI_STYLE_ALREADY_PATCHED');
  process.exit(0);
}

function replaceOnce(source, search, replacement, label) {
  const index = source.indexOf(search);
  if (index < 0) throw new Error('Cannot patch ' + label + ': marker not found');
  return source.slice(0, index) + replacement + source.slice(index + search.length);
}

// 1. Add setWidgetStyle, showContextMenu, and macOS menu bar commands to Tauri bridge
html = replaceOnce(
  html,
  "    setWidgetWidth: value => invoke('set_widget_width', { value: Number(value) }),",
  "    setWidgetWidth: value => invoke('set_widget_width', { value: Number(value) }),\n    setWidgetStyle: style => invoke('set_widget_style', { style: String(style) }),\n    showContextMenu: () => invoke('show_context_menu'),\n    setMacMenuBarCountdown: value => invoke('set_mac_menu_bar_countdown', { value: Boolean(value) }),\n    updateTrayTitle: title => invoke('update_tray_title', { title: String(title) }),",
  'Tauri bridge multi-style methods'
);

// 2. Add styles for button-free widget, 4 multi-size styles, and Settings style picker
const css = String.raw`
/* MULTI_STYLE_316_READY */
body.electron:not(.settings-only) #gear,
body.electron:not(.settings-only) #pin,
body.electron:not(.settings-only) #minus,
body.electron:not(.settings-only) #quit { display: none !important; pointer-events: none !important; }
body.electron:not(.settings-only) #widgetResize { opacity: 0; transition: opacity .18s ease, background .18s ease; }
body.electron:not(.settings-only) #widgetResize:hover,
body.electron:not(.settings-only) #widgetResize:focus-visible { opacity: .92; background: rgba(32,50,74,.78); }

#widgetStylesRoot { display: none; position: fixed; inset: 0; overflow: hidden; user-select: none; pointer-events: auto; }
body.electron:not(.settings-only).style-balanced #viewport,
body.electron:not(.settings-only).style-compact #viewport,
body.electron:not(.settings-only).style-minimal #viewport { display: none !important; }
body.electron:not(.settings-only).style-balanced #widgetStylesRoot,
body.electron:not(.settings-only).style-compact #widgetStylesRoot,
body.electron:not(.settings-only).style-minimal #widgetStylesRoot { display: block !important; }

#styleCanvas { position: absolute; left: 0; top: 0; transform-origin: 0 0; overflow: visible; }
.ws-view { display: none; position: relative; width: 100%; height: 100%; font-family: Inter, "SF Pro Display", "Segoe UI", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif; color: #f5f8ff; }
body.style-balanced #ws-balanced { display: block; }
body.style-compact #ws-compact { display: block; }
body.style-minimal #ws-minimal { display: block; }

.ws-cat { position: absolute; pointer-events: none; z-index: 6; user-select: none; -webkit-user-drag: none; filter: drop-shadow(0 3px 6px rgba(0,0,0,.35)); }
.ws-card {
  position: absolute;
  overflow: hidden;
  border: 1px solid rgba(196, 214, 245, .34);
  background: linear-gradient(142deg, rgba(40, 52, 80, .95), rgba(16, 25, 45, .96) 54%, rgba(27, 39, 63, .95));
  box-shadow: inset 0 1px 0 rgba(255, 232, 198, .28), inset 0 0 28px rgba(132, 174, 236, .10);
}
.ws-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 60% 45% at 8% 0%, rgba(255, 211, 152, .16), transparent 65%),
    radial-gradient(ellipse 55% 50% at 95% 100%, rgba(88, 174, 214, .12), transparent 60%);
}
.ws-card::after {
  content: '';
  position: absolute;
  left: 6%;
  right: 6%;
  top: 0;
  height: 1.5px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255, 224, 178, .85) 28%, rgba(164, 198, 244, .45) 70%, transparent);
}
.ws-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: .3px;
  background: rgba(101, 241, 174, .14);
  border: 1px solid rgba(114, 244, 184, .32);
  color: #8fffc3;
}
.ws-pill.lunch { background: rgba(255, 214, 148, .15); border-color: rgba(255, 214, 148, .35); color: #ffdca2; }
.ws-pill.rest { background: rgba(168, 188, 216, .14); border-color: rgba(168, 188, 216, .28); color: #cbd7e8; }
.ws-dot { width: 7px; height: 7px; border-radius: 50%; background: #65f1ae; box-shadow: 0 0 8px #4df7a8; flex: none; }
.ws-dot.lunch { background: #ffd796; box-shadow: 0 0 8px #ffc56c; }
.ws-dot.rest { background: #a8bbd2; box-shadow: none; }

/* ---- Style 2: Balanced (520 x 356) ---- */
#ws-balanced .ws-cat { top: 2px; right: 18px; width: 174px; height: auto; }
#ws-balanced .ws-card { left: 4px; right: 4px; top: 57px; bottom: 4px; border-radius: 26px; padding: 15px 20px 16px; display: flex; flex-direction: column; justify-content: space-between; }
.wsb-head { position: relative; z-index: 2; display: flex; align-items: center; gap: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(186, 206, 234, .15); }
.wsb-clock { width: 22px; height: 22px; border-radius: 50%; border: 1.8px solid #f2d49d; display: grid; place-items: center; color: #f7e0b5; font-size: 12px; box-shadow: 0 0 10px rgba(242, 212, 157, .28); }
.wsb-title { font-size: 16px; font-weight: 650; letter-spacing: .5px; color: #f6f8ff; }
.wsb-top { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 8px; }
.wsb-label { font-size: 13px; color: #a7b8d0; letter-spacing: .3px; }
.wsb-timer { font-size: 48px; line-height: 1.06; font-weight: 680; letter-spacing: -1.8px; color: #f8faff; font-variant-numeric: tabular-nums; margin-top: 3px; text-shadow: 0 2px 12px rgba(200, 216, 248, .22); }
.wsb-timer.long { font-size: 34px; letter-spacing: -.8px; }
.wsb-meta { margin-top: 6px; font-size: 12px; color: #9db0ca; display: flex; gap: 12px; align-items: center; font-variant-numeric: tabular-nums; }
.wsb-ring-wrap { position: relative; width: 98px; height: 98px; flex: none; }
.wsb-ring-wrap svg { width: 98px; height: 98px; transform: rotate(-90deg); }
.wsb-ring-bg { fill: none; stroke: rgba(114, 138, 170, .35); stroke-width: 9; }
.wsb-ring-fg { fill: none; stroke: #65f1ae; stroke-width: 9; stroke-linecap: round; filter: drop-shadow(0 0 6px rgba(95, 242, 175, .45)); transition: stroke-dashoffset .3s linear; }
.wsb-ring-txt { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.wsb-ring-sub { font-size: 10px; color: #9eb2cc; }
.wsb-ring-pct { font-size: 22px; font-weight: 700; color: #f8fcff; font-variant-numeric: tabular-nums; line-height: 1.15; }
.wsb-gold {
  position: relative;
  z-index: 2;
  margin-top: 10px;
  padding: 12px 16px;
  border-radius: 17px;
  border: 1px solid rgba(240, 206, 146, .34);
  background: linear-gradient(122deg, rgba(242, 193, 118, .20), rgba(26, 37, 58, .88) 44%, rgba(20, 30, 49, .92));
  box-shadow: inset 0 1px 0 rgba(255, 232, 186, .30);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.wsb-gold-title { font-size: 12px; color: #d5e0f0; display: flex; align-items: center; gap: 6px; }
.wsb-gold-val { font-size: 32px; line-height: 1.12; font-weight: 720; color: #ffe3a0; letter-spacing: -.8px; font-variant-numeric: tabular-nums; text-shadow: 0 0 10px rgba(251, 197, 117, .35); margin-top: 2px; }
.wsb-gold-note { font-size: 11px; color: #9eb4ce; margin-top: 3px; display: flex; align-items: center; gap: 5px; }
.wsb-stats { display: flex; flex-direction: column; gap: 5px; min-width: 146px; }
.wsb-stat-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 4px 10px; border-radius: 8px; background: rgba(255, 255, 255, .055); border: 1px solid rgba(186, 206, 234, .12); }
.wsb-stat-row span { color: #9eb2cb; }
.wsb-stat-row strong { color: #f2f6ff; font-weight: 650; font-variant-numeric: tabular-nums; }

/* ---- Style 3: Compact (460 x 214) ---- */
#ws-compact .ws-cat { top: 2px; right: 16px; width: 146px; height: auto; }
#ws-compact .ws-card { left: 4px; right: 4px; top: 48px; bottom: 4px; border-radius: 23px; padding: 13px 20px 13px; display: flex; flex-direction: column; justify-content: space-between; }
.wsc-head { position: relative; z-index: 2; display: flex; align-items: center; gap: 8px; }
.wsc-title { font-size: 14px; font-weight: 650; color: #f4f7ff; }
.wsc-grid { position: relative; z-index: 2; display: grid; grid-template-columns: 1.06fr .94fr; gap: 14px; align-items: end; margin-top: 6px; }
.wsc-lbl { font-size: 11.5px; color: #9fb2cc; margin-bottom: 3px; }
.wsc-timer { font-size: 35px; line-height: 1.05; font-weight: 680; letter-spacing: -1.2px; color: #f8faff; font-variant-numeric: tabular-nums; }
.wsc-timer.long { font-size: 25px; letter-spacing: -.5px; }
.wsc-money-col { text-align: right; }
.wsc-money { font-size: 32px; line-height: 1.05; font-weight: 730; letter-spacing: -.8px; color: #ffe3a0; font-variant-numeric: tabular-nums; text-shadow: 0 0 10px rgba(246, 192, 108, .35); }
.wsc-track { position: relative; z-index: 2; height: 6px; border-radius: 999px; background: rgba(114, 136, 168, .34); overflow: hidden; margin-top: 10px; }
.wsc-track > span { display: block; height: 100%; width: 0; border-radius: 999px; background: linear-gradient(90deg, #4dd7d4, #68f4ab); box-shadow: 0 0 10px rgba(101, 241, 174, .45); transition: width .3s linear; }
.wsc-foot { position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: #9eb1ca; margin-top: 7px; font-variant-numeric: tabular-nums; }
.wsc-foot strong { color: #96f8c6; font-weight: 650; }

/* ---- Style 4: Minimal single-bar countdown (360 x 128) ---- */
#ws-minimal .ws-cat { top: 1px; right: 16px; width: 114px; height: auto; }
#ws-minimal .ws-card { left: 4px; right: 4px; top: 36px; bottom: 4px; border-radius: 21px; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; }
.wsm-left { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 4px; }
.wsm-top { display: flex; align-items: center; gap: 7px; }
.wsm-label { font-size: 14px; font-weight: 650; color: #eaf1ff; letter-spacing: .3px; }
.wsm-sub { font-size: 11.5px; color: #9ab0cc; padding-left: 14px; }
.wsm-timer { position: relative; z-index: 2; font-size: 40px; line-height: 1; font-weight: 700; letter-spacing: -1.4px; color: #f8faff; font-variant-numeric: tabular-nums; text-shadow: 0 2px 12px rgba(188, 212, 248, .26); }
.wsm-timer.long { font-size: 27px; letter-spacing: -.6px; }
.wsm-line { position: absolute; left: 16px; right: 16px; bottom: 0; height: 3px; border-radius: 999px; background: rgba(116, 140, 172, .25); overflow: hidden; }
.wsm-line > span { display: block; height: 100%; width: 0; border-radius: 999px; background: linear-gradient(90deg, #4dd7d4, #68f4ab); box-shadow: 0 0 8px rgba(101, 241, 174, .5); transition: width .3s linear; }

/* ---- Settings window style picker ---- */
body.settings-only .style-picker-wrap { grid-column: 1 / -1; }
body.settings-only .style-picker-title { font-size: 12px; font-weight: 600; color: #bac8db; margin-bottom: 8px; }
body.settings-only .style-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
body.settings-only .style-opt {
  text-align: left;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #8298b32b;
  background: #0c162580;
  color: #cbd6e6;
  cursor: pointer;
  transition: border-color .15s, background .15s, transform .12s;
  font-family: inherit;
}
body.settings-only .style-opt:hover { border-color: #d7b77866; background: #142238; }
body.settings-only .style-opt.active {
  border-color: #e2c183;
  background: linear-gradient(135deg, rgba(215, 183, 120, .18), rgba(20, 32, 52, .92));
  box-shadow: 0 0 0 1px rgba(226, 193, 131, .35);
}
body.settings-only .style-opt .st-name { font-size: 13px; font-weight: 650; color: #f6efe0; display: flex; justify-content: space-between; align-items: center; }
body.settings-only .style-opt .st-size { font-size: 10.5px; color: #d8b97c; font-weight: 500; }
body.settings-only .style-opt .st-desc { font-size: 11px; color: #95a8c0; margin-top: 4px; line-height: 1.4; }
body.settings-only #macMenuBarRow.mac-hidden { display: none !important; }
</style></head>
`;
html = replaceOnce(html, '</style></head>', css, 'multi-style CSS');

// 3. Inject multi-style DOM right before <div id="miniPanel"
const stylesHtml = String.raw`
<div id="widgetStylesRoot" aria-label="下班工资计数器桌面小组件">
  <div id="styleCanvas">
    <div id="ws-balanced" class="ws-view">
      <img class="ws-cat" alt="" />
      <div class="ws-card">
        <div class="wsb-head">
          <span class="wsb-clock">◷</span>
          <span class="wsb-title">下班倒计时</span>
          <span class="ws-pill" id="wsbStatus">工作中</span>
        </div>
        <div class="wsb-top">
          <div>
            <div class="wsb-label">距离下班还有</div>
            <div class="wsb-timer" id="wsbTimer">02:47:32</div>
            <div class="wsb-meta"><span id="wsbDate">2026/11/25</span><span id="wsbWork">08:30 - 17:30</span></div>
          </div>
          <div class="wsb-ring-wrap">
            <svg viewBox="0 0 100 100">
              <circle class="wsb-ring-bg" cx="50" cy="50" r="41" />
              <circle class="wsb-ring-fg" id="wsbRing" cx="50" cy="50" r="41" stroke-dasharray="257.61" stroke-dashoffset="100" />
            </svg>
            <div class="wsb-ring-txt">
              <span class="wsb-ring-sub">今日进度</span>
              <span class="wsb-ring-pct" id="wsbPct">63%</span>
            </div>
          </div>
        </div>
        <div class="wsb-gold">
          <div>
            <div class="wsb-gold-title">今日已获得工资</div>
            <div class="wsb-gold-val" id="wsbEarned">¥126.438</div>
            <div class="wsb-gold-note"><span class="ws-dot" id="wsbDot"></span><span>按工作日逐秒实时累计</span></div>
          </div>
          <div class="wsb-stats">
            <div class="wsb-stat-row"><span>日薪</span><strong id="wsbDaily">¥309.524</strong></div>
            <div class="wsb-stat-row"><span>时薪</span><strong id="wsbHourly">¥34.392</strong></div>
            <div class="wsb-stat-row"><span>已工作</span><strong id="wsbWorked">03:53:28</strong></div>
          </div>
        </div>
      </div>
    </div>

    <div id="ws-compact" class="ws-view">
      <img class="ws-cat" alt="" />
      <div class="ws-card">
        <div class="wsc-head">
          <span class="ws-dot" id="wscDot"></span>
          <span class="wsc-title">下班倒计时</span>
          <span class="ws-pill" id="wscStatus">工作中</span>
        </div>
        <div class="wsc-grid">
          <div>
            <div class="wsc-lbl">距离下班</div>
            <div class="wsc-timer" id="wscTimer">02:47:32</div>
          </div>
          <div class="wsc-money-col">
            <div class="wsc-lbl">今日已赚</div>
            <div class="wsc-money" id="wscEarned">¥126.438</div>
          </div>
        </div>
        <div>
          <div class="wsc-track"><span id="wscBar"></span></div>
          <div class="wsc-foot"><span id="wscWork">上班 08:30 · 下班 17:30</span><span>今日进度 <strong id="wscPct">63%</strong></span></div>
        </div>
      </div>
    </div>

    <div id="ws-minimal" class="ws-view">
      <img class="ws-cat" alt="" />
      <div class="ws-card">
        <div class="wsm-left">
          <div class="wsm-top"><span class="ws-dot" id="wsmDot"></span><span class="wsm-label">距离下班</span></div>
          <div class="wsm-sub" id="wsmStatus">工作中</div>
        </div>
        <div class="wsm-timer" id="wsmTimer">02:47:32</div>
        <div class="wsm-line"><span id="wsmBar"></span></div>
      </div>
    </div>
  </div>
</div>
`;
html = replaceOnce(html, '<div id="miniPanel"', stylesHtml + '<div id="miniPanel"', 'multi-style DOM');

// 4. Add multi-style controller, right-click native menu, live renderer hook, and Settings picker
const script = String.raw`
<script>
(() => {
  const STYLE_META = {
    standard: { name: '完整标准版', size: '默认 520px', desc: '完整数据、进度环、增长曲线与月度统计', refW: 1060, refH: 1068, min: 320, max: 1060, def: 520 },
    balanced: { name: '均衡双卡版', size: '默认 460px', desc: '大号倒计时、进度环 + 今日工资金卡', refW: 520, refH: 356, min: 320, max: 860, def: 460 },
    compact:  { name: '精致紧凑版', size: '默认 380px', desc: '倒计时 + 今日已赚金额 + 底部进度条', refW: 460, refH: 214, min: 280, max: 680, def: 380 },
    minimal:  { name: '极简倒计时', size: '默认 300px', desc: '仅显示一栏下班倒计时，极简不占桌面', refW: 360, refH: 128, min: 220, max: 560, def: 300 }
  };
  let currentStyle = 'standard';
  let lastTrayTitle = null;

  function formatMacMenuBarTitle(info) {
    if (!info || !info.now) return '';
    const st = info.status;
    const cd = Math.max(0, Math.floor(info.cd || 0));
    const compactCd = cd >= 86400
      ? Math.floor(cd / 86400) + '天' + pad(Math.floor((cd % 86400) / 3600)) + 'h'
      : cd >= 3600
        ? hms(cd)
        : pad(Math.floor(cd / 60)) + ':' + pad(cd % 60);

    if (st === '休息中') return '🏖️ 休息中';
    if (st === '已下班') return '🎉 已下班';
    if (st === '未上班') return '🌅 ' + compactCd;
    if (st === '午休中') return '🍱 ' + compactCd;

    const s = toMin(cfg.start), e = toMin(cfg.end), a = toMin(cfg.lunchStart), b = toMin(cfg.lunchEnd);
    const m = info.minute;
    const sinceStart = m - s;
    const toLunch = a - m;
    const sinceLunch = m - b;
    const toEnd = e - m;

    let emoji = '💻';
    if (toEnd <= 10) {
      emoji = '🚀';
    } else if (toEnd <= 60) {
      emoji = '🏃';
    } else if (sinceStart <= 90) {
      emoji = '☕';
    } else if (toLunch > 0 && toLunch <= 30) {
      emoji = '🤤';
    } else if (sinceLunch >= 0 && sinceLunch <= 90) {
      emoji = '😪';
    } else if (sinceLunch > 90) {
      emoji = '😮‍💨';
    }
    return emoji + ' ' + compactCd;
  }

  function pushMacTrayTitle(force) {
    if (window.__salarySettings || cfg.platform !== 'macos' || !window.salaryApp?.updateTrayTitle) return;
    const title = cfg.macMenuBarCountdown === false ? '' : formatMacMenuBarTitle(last);
    if (!force && title === lastTrayTitle) return;
    lastTrayTitle = title;
    window.salaryApp.updateTrayTitle(title).catch(() => {});
  }

  window.__formatMacMenuBarTitle = formatMacMenuBarTitle;

  function getMeta(id) {
    return STYLE_META[id] || STYLE_META.standard;
  }

  function applyStyleClass(styleId) {
    currentStyle = STYLE_META[styleId] ? styleId : 'standard';
    cfg.widgetStyle = currentStyle;
    document.body.classList.remove('style-standard', 'style-balanced', 'style-compact', 'style-minimal');
    document.body.classList.add('style-' + currentStyle);
    scaleMultiStyle();
    syncMultiStyleData();
  }

  function scaleMultiStyle() {
    if (window.__salarySettings) return;
    if (currentStyle === 'standard') return;
    const meta = getMeta(currentStyle);
    const canvas = document.getElementById('styleCanvas');
    if (!canvas) return;
    const scale = Math.min(window.innerWidth / meta.refW, window.innerHeight / meta.refH);
    canvas.style.width = meta.refW + 'px';
    canvas.style.height = meta.refH + 'px';
    canvas.style.transform = 'scale(' + scale + ')';
  }

  function syncMultiStyleData() {
    if (window.__salarySettings || !last || !last.now) return;
    const info = last;
    const cdText = info.cd >= 86400 ? Math.floor(info.cd / 86400) + '天 ' + hms(info.cd % 86400) : hms(info.cd);
    const isLong = info.cd >= 86400;
    const pct = Math.round(info.ratio * 100);
    const st = info.status;
    const stateCls = st === '工作中' ? '' : (st === '午休中' ? 'lunch' : 'rest');

    // Balanced
    const wsbStatus = document.getElementById('wsbStatus');
    if (wsbStatus) {
      wsbStatus.textContent = st;
      wsbStatus.className = 'ws-pill ' + stateCls;
      const t = document.getElementById('wsbTimer');
      t.textContent = cdText;
      t.classList.toggle('long', isLong);
      document.getElementById('wsbDate').textContent = info.now.getFullYear() + '/' + pad(info.now.getMonth() + 1) + '/' + pad(info.now.getDate());
      document.getElementById('wsbWork').textContent = cfg.start + ' - ' + cfg.end;
      const circ = 2 * Math.PI * 41;
      const ring = document.getElementById('wsbRing');
      ring.style.strokeDasharray = String(circ);
      ring.style.strokeDashoffset = String(circ * (1 - info.ratio));
      document.getElementById('wsbPct').textContent = pct + '%';
      document.getElementById('wsbEarned').textContent = numberMoney(info.earned);
      document.getElementById('wsbDot').className = 'ws-dot ' + stateCls;
      document.getElementById('wsbDaily').textContent = numberMoney(info.daily);
      document.getElementById('wsbHourly').textContent = numberMoney(info.hourly);
      document.getElementById('wsbWorked').textContent = hms(info.sec);
    }

    // Compact
    const wscStatus = document.getElementById('wscStatus');
    if (wscStatus) {
      wscStatus.textContent = st;
      wscStatus.className = 'ws-pill ' + stateCls;
      document.getElementById('wscDot').className = 'ws-dot ' + stateCls;
      const t = document.getElementById('wscTimer');
      t.textContent = cdText;
      t.classList.toggle('long', isLong);
      document.getElementById('wscEarned').textContent = numberMoney(info.earned);
      document.getElementById('wscBar').style.width = pct + '%';
      document.getElementById('wscWork').textContent = '上班 ' + cfg.start + ' · 下班 ' + cfg.end;
      document.getElementById('wscPct').textContent = pct + '%';
    }

    // Minimal
    const wsmTimer = document.getElementById('wsmTimer');
    if (wsmTimer) {
      document.getElementById('wsmDot').className = 'ws-dot ' + stateCls;
      document.getElementById('wsmStatus').textContent = st;
      wsmTimer.textContent = cdText;
      wsmTimer.classList.toggle('long', isLong);
      document.getElementById('wsmBar').style.width = pct + '%';
    }

    pushMacTrayTitle(false);
  }

  // Copy the clean embedded sleeping cat image into all multi-style views
  const catSrc = document.querySelector('#miniPanel .mini-cat')?.getAttribute('src');
  if (catSrc) {
    document.querySelectorAll('#widgetStylesRoot .ws-cat').forEach(img => { img.src = catSrc; });
  }

  // Hook render() & resize() so multi-styles stay 100% live & scaled
  const origRender = window.render || render;
  render = function () { origRender(); syncMultiStyleData(); };
  const origResize = window.resize || resize;
  resize = function () { origResize(); scaleMultiStyle(); };
  window.addEventListener('resize', scaleMultiStyle);

  // Widget mode: native right-click menu + live style sync
  if (!window.__salarySettings) {
    window.addEventListener('contextmenu', e => {
      if (!window.salaryApp?.showContextMenu) return;
      e.preventDefault();
      window.salaryApp.showContextMenu().catch(err => toast(String(err)));
    });

    if (window.salaryApp?.getDesktopPrefs) {
      window.salaryApp.getDesktopPrefs().then(prefs => {
        if (prefs) {
          Object.assign(cfg, prefs);
          applyStyleClass(prefs.widgetStyle || 'standard');
          pushMacTrayTitle(true);
        }
      }).catch(() => {});
    }
    if (window.salaryApp?.listen) {
      window.salaryApp.listen('desktop-preferences', prefs => {
        if (!prefs) return;
        Object.assign(cfg, prefs);
        if (prefs.widgetStyle && prefs.widgetStyle !== currentStyle) {
          applyStyleClass(prefs.widgetStyle);
        } else {
          scaleMultiStyle();
        }
        pushMacTrayTitle(true);
      });
    }
  } else {
    // Independent Settings window: add visual 4-style picker + macOS-only menu bar switch
    const desktopGrid = document.querySelectorAll('.modal-scroll fieldset')[3]?.querySelector('.settings-grid');
    let macSwitchLabel = null;
    let macSwitchInput = null;
    if (desktopGrid) {
      macSwitchLabel = document.createElement('label');
      macSwitchLabel.className = 'settings-switch mac-hidden';
      macSwitchLabel.id = 'macMenuBarRow';
      macSwitchLabel.style.gridColumn = '1 / -1';
      macSwitchInput = document.createElement('input');
      macSwitchInput.type = 'checkbox';
      macSwitchInput.id = 'setMacMenuBar';
      macSwitchLabel.append(macSwitchInput, document.createTextNode('顶部状态栏显示倒计时与状态表情（仅 macOS）'));
      desktopGrid.append(macSwitchLabel);
    }

    function syncMacSwitchVisibility() {
      if (!macSwitchLabel || !macSwitchInput) return;
      const isMac = cfg.platform === 'macos';
      macSwitchLabel.classList.toggle('mac-hidden', !isMac);
      if (isMac) macSwitchInput.checked = cfg.macMenuBarCountdown !== false;
    }

    const sizeBox = document.querySelector('.settings-size');
    const widthInput = document.getElementById('setWidth');
    const rangeInput = document.getElementById('sizeRange');
    const sizeHints = document.querySelector('.size-hints');
    const helper = document.querySelectorAll('.modal-scroll fieldset')[3]?.querySelector('.helper');
    if (helper) {
      helper.textContent = '主组件固定在桌面右上角，右键点击小组件可随时切换样式、置顶、打开设置或隐藏。';
    }
    if (sizeBox && widthInput && rangeInput) {
      const wrap = document.createElement('div');
      wrap.className = 'style-picker-wrap';
      wrap.innerHTML = '<div class="style-picker-title">组件样式与展示信息</div><div class="style-grid"></div>';
      const grid = wrap.querySelector('.style-grid');
      let selectedStyle = cfg.widgetStyle || 'standard';
      const btns = {};

      function updateSliderBounds(styleId, keepCurrentValue) {
        const m = getMeta(styleId);
        widthInput.min = String(m.min);
        widthInput.max = String(m.max);
        rangeInput.min = String(m.min);
        rangeInput.max = String(m.max);
        if (sizeHints) {
          sizeHints.innerHTML = '<span>紧凑 · ' + m.min + '</span><span>默认 · ' + m.def + '</span><span>宽屏 · ' + m.max + '</span>';
        }
        const savedForStyle = cfg.widgetWidths && Number.isFinite(Number(cfg.widgetWidths[styleId]))
          ? Number(cfg.widgetWidths[styleId])
          : m.def;
        const val = keepCurrentValue
          ? Math.round(Math.min(m.max, Math.max(m.min, Number(widthInput.value) || savedForStyle)))
          : Math.round(Math.min(m.max, Math.max(m.min, savedForStyle)));
        widthInput.value = String(val);
        rangeInput.value = String(val);
      }

      function markStyle(styleId, updateVal) {
        selectedStyle = STYLE_META[styleId] ? styleId : 'standard';
        Object.entries(btns).forEach(([k, b]) => b.classList.toggle('active', k === selectedStyle));
        updateSliderBounds(selectedStyle, !updateVal);
      }

      Object.entries(STYLE_META).forEach(([id, meta]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'style-opt';
        btn.dataset.styleId = id;
        btn.innerHTML = '<div class="st-name"><span>' + meta.name + '</span><span class="st-size">' + meta.size + '</span></div><div class="st-desc">' + meta.desc + '</div>';
        btn.addEventListener('click', () => {
          if (cfg.widgetWidths) cfg.widgetWidths[selectedStyle] = Number(widthInput.value) || getMeta(selectedStyle).def;
          markStyle(id, true);
        });
        btns[id] = btn;
        grid.append(btn);
      });

      sizeBox.before(wrap);

      const prevFormFill = formFill;
      formFill = function () {
        prevFormFill();
        markStyle(cfg.widgetStyle || 'standard', true);
        syncMacSwitchVisibility();
      };

      const prevSaveConfig = saveConfig;
      saveConfig = async function () {
        const m = getMeta(selectedStyle);
        const targetWidth = Math.round(Math.min(m.max, Math.max(m.min, Number(widthInput.value) || m.def)));
        if (window.salaryApp?.setWidgetStyle) {
          try {
            await window.salaryApp.setWidgetStyle(selectedStyle);
          } catch (e) {
            toast('切换样式失败：' + e);
            return;
          }
        }
        if (cfg.platform === 'macos' && macSwitchInput && window.salaryApp?.setMacMenuBarCountdown) {
          try {
            await window.salaryApp.setMacMenuBarCountdown(macSwitchInput.checked);
            cfg.macMenuBarCountdown = macSwitchInput.checked;
          } catch (e) {
            toast('保存状态栏设置失败：' + e);
            return;
          }
        }
        cfg.widgetStyle = selectedStyle;
        widthInput.value = String(targetWidth);
        await prevSaveConfig();
      };
      document.getElementById('save').onclick = saveConfig;
      markStyle(cfg.widgetStyle || 'standard', true);
      syncMacSwitchVisibility();
    }
  }
})();
</script>
`;
html = replaceOnce(html, '</body>', script + '</body>', 'multi-style script');

// 5. Allow width clamping in saveConfig() to respect style min/max (220..1060)
html = replaceOnce(
  html,
  "widgetWidth:Math.round(Math.min(1060,Math.max(320,Number($('setWidth').value)||520)))",
  "widgetWidth:Math.round(Math.min(1060,Math.max(220,Number($('setWidth').value)||520)))",
  'saveConfig min width for minimal style'
);

fs.writeFileSync(file, html, 'utf8');
console.log('MULTI_STYLE_316_PATCHED');
