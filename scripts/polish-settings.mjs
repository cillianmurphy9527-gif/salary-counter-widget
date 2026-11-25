import fs from 'node:fs';
const file='index.html';
let html=fs.readFileSync(file,'utf8');
if(html.includes('SETTINGS_314_READY'))process.exit(0);
const css=String.raw`
/* SETTINGS_314_READY — only the separate settings window */
body.settings-only{background:#0b1220!important;color-scheme:dark}
body.settings-only #modal{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei UI",sans-serif;background:radial-gradient(ellipse at 85% 0%,#243047 0%,transparent 48%),#0e1726;color:#f3f5fa}
body.settings-only .modal-head{padding:20px 22px 17px;gap:12px;align-items:center;border-bottom:0}
body.settings-only .modal-head .settings-brand{display:flex;align-items:center;gap:13px;min-width:0}
body.settings-only .settings-logo{width:48px;height:48px;object-fit:contain;flex:none}
body.settings-only .settings-kicker{font-size:10px;font-weight:700;color:#d7b778;letter-spacing:2px;margin:0 0 5px}
body.settings-only .modal-head h2{font-size:23px;line-height:1.15;font-weight:650;letter-spacing:.3px;color:#f7f4ed}
body.settings-only .modal-head p{font-size:12px;line-height:1.5;color:#a6b4c7;margin:5px 0 0}
body.settings-only .iconbtn{width:30px;height:30px;background:#ffffff08;color:#aebacc;border:1px solid #ffffff14;border-radius:9px;flex:none}
body.settings-only .settings-nav{flex:none;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:4px;margin:0 20px 13px;background:#080f1a9c;border:1px solid #ffffff13;border-radius:11px}
body.settings-only .settings-nav button{font:600 12px inherit;font-family:inherit;font-size:12px;font-weight:600;white-space:nowrap;padding:9px 3px;border:1px solid transparent;border-radius:8px;color:#a9b7cc;background:transparent;cursor:pointer}
body.settings-only .settings-nav button.active{color:#f3d79d;background:linear-gradient(145deg,#3a352d,#282a30);border-color:#c8a66c38}
body.settings-only .settings-nav button:hover{color:#f9e4ba}
body.settings-only .modal-scroll{padding:0 20px 16px;scrollbar-width:thin;scrollbar-color:#526079 transparent;scroll-behavior:auto}
body.settings-only fieldset{position:relative;padding:15px;margin:0 0 14px;min-width:0;border:1px solid #8298b329;border-radius:14px;background:linear-gradient(145deg,#1d293baf,#131d2cfa);box-shadow:0 3px 12px #0002;scroll-margin-top:5px}
body.settings-only fieldset legend{font-size:14px;letter-spacing:.2px;font-weight:650;color:#f0d4a3;padding:0 7px}
body.settings-only .settings-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:13px 14px}
body.settings-only label.field{font-size:12px;font-weight:550;gap:6px;color:#bac8db}
body.settings-only label.field input,body.settings-only label.field select,body.settings-only label.field textarea{box-sizing:border-box;width:100%;font-size:14px;line-height:1.4;padding:10px 11px;border:1px solid #8298b333;border-radius:9px;background:#0c1625;color:#f3f6fc;transition:border-color .15s,box-shadow .15s;font-variant-numeric:tabular-nums}
body.settings-only label.field input:focus,body.settings-only label.field select:focus,body.settings-only label.field textarea:focus{border-color:#d7b778;box-shadow:0 0 0 3px #d7b77819}
body.settings-only label.field textarea{min-height:70px;line-height:1.6}
body.settings-only .helper{font-size:11px;line-height:1.65;color:#9caec4;margin:11px 0 0}
body.settings-only .week-checks{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;padding:2px 0}
body.settings-only .week-checks label{padding:8px 1px;font-size:12px;justify-content:center;gap:0;background:#101a29;border:1px solid #8298b329;color:#aebed2;border-radius:8px;position:relative}
body.settings-only .week-checks label:has(input:checked){border-color:#dbbb7955;background:#d7b7781b;color:#f2d6a1;font-weight:650}
body.settings-only .week-checks input{position:absolute;opacity:0;width:100%;height:100%;inset:0;margin:0;cursor:pointer}
body.settings-only .week-checks label:focus-within{outline:2px solid #d7b778;outline-offset:2px}
body.settings-only .settings-switch{display:flex!important;justify-content:space-between;flex-direction:row-reverse;align-items:center;gap:9px!important;background:#0c162568;border:1px solid #8298b323;border-radius:9px;padding:10px 11px;color:#dce5f2!important;font-size:12px!important;line-height:1.5;cursor:pointer;min-width:0}
body.settings-only .settings-switch input{appearance:none;-webkit-appearance:none;flex:0 0 34px;width:34px;height:19px;border-radius:12px;background:#445166;border:1px solid #ffffff13;position:relative;margin:0;cursor:pointer;transition:background .15s}
body.settings-only .settings-switch input::after{content:"";position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;background:#edf2f9;transition:transform .15s}
body.settings-only .settings-switch input:checked{background:#aa8a54}
body.settings-only .settings-switch input:checked::after{transform:translateX(15px);background:#fff4da}
body.settings-only .settings-switch input:focus-visible{outline:2px solid #f2d39b;outline-offset:3px}
body.settings-only .settings-size{grid-column:1/-1;background:#0c162568;border:1px solid #8298b323;border-radius:10px;padding:12px}
body.settings-only .settings-size-top{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:#bac8db}
body.settings-only .settings-size-top input{width:86px!important;padding:6px 8px!important;text-align:right}
body.settings-only #sizeRange{width:100%;margin:12px 0 4px;accent-color:#d6b578;cursor:pointer}
body.settings-only .size-hints{display:flex;justify-content:space-between;font-size:10px;color:#879ab3;margin-top:3px}
body.settings-only .modal-foot{display:flex;justify-content:space-between;align-items:center;gap:7px;padding:12px 20px;border-top:1px solid #8298b32b;background:#0c1523;flex-wrap:wrap}
body.settings-only .foot-right{display:flex;align-items:center;gap:6px}
body.settings-only .action{padding:9px 10px;border-radius:8px;border:1px solid #8298b32b;background:#ffffff05;color:#c1cee0;font-size:12px;line-height:1.2;white-space:nowrap}
body.settings-only .action:hover{background:#ffffff12;color:#fff}
body.settings-only .action.primary{background:linear-gradient(120deg,#f1d8a1,#bf9659);color:#201b15;border:1px solid #e6c791;font-weight:750;box-shadow:0 3px 12px #c59b5128;padding:10px 14px}
body.settings-only .action.danger{color:#dca1a4}
body.settings-only #previewMode{display:none!important}
@media(max-width:430px){body.settings-only .modal-head{padding:15px}body.settings-only .settings-nav{margin:0 12px 10px}body.settings-only .modal-scroll{padding:0 12px 10px}body.settings-only .modal-foot{padding:10px 12px}body.settings-only .settings-grid{grid-template-columns:1fr}body.settings-only .week-checks label{font-size:11px}}
</style></head>`;
html=html.replace('</style></head>',css);
const script=String.raw`
<script>
if(window.__salarySettings){
  const modal=document.getElementById('modal');
  const head=modal.querySelector('.modal-head');
  const heading=head.firstElementChild;
  const brand=document.createElement('div');brand.className='settings-brand';
  const logo=document.createElement('img');logo.src='assets/icon.png';logo.alt='';logo.className='settings-logo';
  const kicker=document.createElement('div');kicker.className='settings-kicker';kicker.textContent='SALARY COUNTER';
  heading.prepend(kicker);heading.querySelector('p').textContent='管理工资、工作安排与桌面显示';
  head.prepend(brand);brand.append(logo,heading);
  const scroll=modal.querySelector('.modal-scroll');
  const sections=[...scroll.querySelectorAll('fieldset')];
  const nav=document.createElement('nav');nav.className='settings-nav';nav.setAttribute('aria-label','设置分类');
  const labels=['薪资','工时','日历','桌面'];
  const buttons=sections.map((section,i)=>{
    const b=document.createElement('button');b.type='button';b.textContent=labels[i];
    b.addEventListener('click',()=>{scroll.scrollTop=section.offsetTop-scroll.firstElementChild.offsetTop;mark(i)});
    nav.append(b);return b;
  });
  function mark(i){buttons.forEach((b,k)=>{b.classList.toggle('active',i===k);if(i===k)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current')})}
  mark(0);head.after(nav);
  scroll.addEventListener('scroll',()=>{const top=scroll.getBoundingClientRect().top;let i=0;sections.forEach((s,k)=>{if(s.getBoundingClientRect().top<=top+40)i=k});if(scroll.scrollHeight-scroll.scrollTop-scroll.clientHeight<3)i=sections.length-1;mark(i)},{passive:true});
  ['setPaidLunch','setPinned','setWidgetEnabled','setAutoStart'].forEach(id=>document.getElementById(id).closest('label').classList.add('settings-switch'));
  const width=document.getElementById('setWidth');const old=width.closest('label');
  const size=document.createElement('div');size.className='settings-size';
  const top=document.createElement('label');top.className='field settings-size-top';top.style.flexDirection='row';top.append(document.createTextNode('组件宽度（px）'),width);
  const range=document.createElement('input');range.type='range';range.id='sizeRange';range.min='320';range.max='1060';range.step='1';range.setAttribute('aria-label','组件宽度');
  const hints=document.createElement('div');hints.className='size-hints';hints.innerHTML='<span>紧凑 · 320</span><span>舒适 · 520</span><span>宽屏 · 1060</span>';
  size.append(top,range,hints);old.replaceWith(size);
  const sync=()=>{range.value=String(Math.min(1060,Math.max(320,Number(width.value)||520)))};
  range.addEventListener('input',()=>{width.value=range.value});width.addEventListener('input',sync);
  const modalFillObserver=new MutationObserver(sync);modalFillObserver.observe(modal,{attributes:true,attributeFilter:['class']});
  // Refresh the range after formFill, including import, reset and window reopening.
  const originalFill=formFill;formFill=function(){originalFill();sync()};sync();
  const helper=sections[3].querySelector('.helper');helper.textContent='主组件固定在桌面右上角，点击桌面或返回桌面时保持显示；开启置顶后可悬浮在所有窗口上方。';
}
</script>
`;
html=html.replace('</body>',script+'</body>');
fs.writeFileSync(file,html);
console.log('SETTINGS_314_READY');
