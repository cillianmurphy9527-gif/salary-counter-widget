from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

html = (Path(__file__).resolve().parents[1] / 'index.html').read_text(encoding='utf-8')
cases = [
    ('上班开始', '2026-11-20T08:30:00', 0, '工作中'),
    ('午休开始', '2026-11-20T12:00:00', None, '午休中'),
    ('午休中途', '2026-11-20T12:30:00', None, '午休中'),
    ('下班时刻', '2026-11-20T17:30:00', None, '已下班'),
    ('周末', '2026-11-21T12:00:00', 0, '休息中'),
    ('国庆休假', '2026-10-01T12:00:00', 0, '休息中'),
    ('国庆补班', '2026-10-10T11:00:00', None, '工作中'),
    ('2027春节', '2027-02-08T12:00:00', 0, '休息中'),
    ('2027春节补班', '2027-01-31T11:00:00', None, '工作中'),
]
with sync_playwright() as p:
    exe = shutil.which('chromium') or shutil.which('chromium-browser')
    browser = p.chromium.launch(headless=True, executable_path=exe if exe else None, args=['--no-sandbox','--disable-dev-shm-usage'])
    errors = []

    # Original full interface: calculation, settings, and existing data remain intact.
    page = browser.new_page(viewport={'width': 1254, 'height': 1254}, device_scale_factor=1)
    page.on('pageerror', lambda error: errors.append('full: ' + str(error)))
    storage_shim = """<script>Object.defineProperty(window,'localStorage',{value:{getItem:key=>null,setItem:(key,value)=>{}},configurable:true});</script>"""
    page.set_content(html.replace('<head>','<head>'+storage_shim))
    page.wait_for_timeout(300)
    results = {}
    for name, date, expected, status in cases:
        value = page.evaluate("d => { const r=calc(new Date(d)); return {status:r.status,earned:r.earned,daily:r.daily,monthly:r.monthly,ratio:r.ratio}; }", date)
        assert value['status'] == status, (name, value)
        if expected is not None:
            assert abs(value['earned'] - expected) < 1e-9, (name, value)
        results[name] = value
    assert abs(results['午休开始']['earned'] - results['午休中途']['earned']) < 1e-8
    assert abs(results['下班时刻']['earned'] - results['下班时刻']['daily']) < 1e-8
    assert abs(page.evaluate("calc(new Date('2026-11-30T17:30:00')).monthly") - 6500) < 1e-9
    page.evaluate("window.__demoClock='2026-11-20T14:42:00+08:00';render()")
    page.wait_for_timeout(150)
    assert page.locator('#earned').inner_text().startswith('¥')
    page.locator('#gear').click()
    assert page.locator('#modal.show').count() == 1
    page.locator('#setNet').fill('7200.125')
    page.locator('#save').click()
    assert page.locator('#monthlyNet').inner_text() == '¥7,200.125'

    # Native-widget simulation: same original artwork is scaled/cropped into 420x423.
    widget = browser.new_page(viewport={'width': 420, 'height': 423}, device_scale_factor=1)
    widget.on('pageerror', lambda error: errors.append('widget: ' + str(error)))
    widget.set_content(html)
    widget.evaluate("""() => {
      window.__nativeMode = 'widget';
      window.__widgetEnabled = true;
      window.__savedConfig = null;
      window.__modeHandler = null;
      window.salaryApp = {
        loadConfig: async () => null,
        saveConfig: async value => { window.__savedConfig = value; return true; },
        setAlwaysOnTop: async value => { window.__pinned = value; return true; },
        getDesktopPrefs: async () => ({widgetEnabled:window.__widgetEnabled,widgetWidth:520,alwaysOnTop:false}),
        setWidgetWidth: async value => { window.__width=value; return value; },
        showSettings: async () => { window.__openedSettings=true; return true; },
        closeSettings: async () => true,
        setLoginItem: async () => true,
        setCompact: async value => { window.__nativeMode = value ? 'widget' : 'full'; if (window.__modeHandler) window.__modeHandler(!!value); return true; },
        setWidgetEnabled: async value => { window.__widgetEnabled = !!value; return true; },
        hide: async () => true,
        removeWidget: async () => { window.__widgetEnabled = false; window.__nativeMode = 'hidden'; return true; },
        showWidget: async () => true,
        showFull: async () => true,
        getWindowMode: async () => window.__nativeMode,
        getWidgetEnabled: async () => window.__widgetEnabled,
        onCompact: handler => { window.__modeHandler = handler; return () => {}; }
      };
      init();
    }""")
    widget.wait_for_timeout(350)
    widget.evaluate("window.__demoClock='2026-11-20T14:42:00+08:00';render()")
    widget.wait_for_timeout(100)
    assert widget.locator('body.electron.compact').count() == 1, '没有进入桌面小组件模式'
    assert widget.locator('#viewport').is_visible(), '原设计图主面板被隐藏'
    assert not widget.locator('#miniPanel').is_visible(), '仍显示旧版重设计小组件'
    assert widget.locator('#art').evaluate('(e)=>e.naturalWidth') == 1254, '原设计图未完整加载'
    vp = widget.locator('#viewport').bounding_box()
    assert vp and abs(vp['x']) < 1 and abs(vp['y']) < 1 and abs(vp['width']-420) < 1 and vp['height'] <= 423, vp
    stage_transform = widget.locator('#stage').evaluate('(e)=>getComputedStyle(e).transform')
    assert 'matrix(' in stage_transform, stage_transform
    for element in ['status','countdown','date','workTime','breakTime','percent','earned','daily','progress','hourly','worked','remaining','chartChip','monthCount','monthWork','monthEarned','monthlyNet','insurance','gear','pin','minus','quit','salaryClick','monthClick']:
        assert widget.locator('#' + element).count() == 1, '原设计内容缺失: ' + element
    assert widget.locator('#earned').inner_text().startswith('¥')
    assert widget.locator('#monthlyNet').inner_text().startswith('¥')
    assert widget.locator('#plotCanvas').count() == 1
    assert widget.locator('#drag').evaluate('(e)=>getComputedStyle(e).display') == 'none', '桌面组件仍可拖动'
    assert widget.evaluate("getComputedStyle(document.body).backgroundColor") in ['rgba(0, 0, 0, 0)', 'transparent'], '窗口背景不是透明'
    # Verify the entire nontransparent original artwork, including the sleeping cat
    # and Z symbols, is inside the visible crop at every supported scale.
    def assert_complete_artwork(page):
        result=page.evaluate("""() => {
          const art=document.getElementById('art'), vp=document.getElementById('viewport');
          const c=document.createElement('canvas');c.width=art.naturalWidth;c.height=art.naturalHeight;
          const ctx=c.getContext('2d');ctx.drawImage(art,0,0);
          const d=ctx.getImageData(0,0,c.width,c.height).data;
          let x0=c.width,y0=c.height,x1=-1,y1=-1,cat=0;
          for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
            if(!d[(y*c.width+x)*4+3])continue;
            x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
            if(y<157)cat++;
          }
          const a=art.getBoundingClientRect(),v=vp.getBoundingClientRect(),scale=a.width/c.width;
          return {cat,inside:a.x+x0*scale>=v.x-.1&&a.y+y0*scale>=v.y-.1&&a.x+(x1+1)*scale<=v.right+.1&&a.y+(y1+1)*scale<=v.bottom+.1};
        }""")
        assert result['cat']>1000 and result['inside'], result
    assert_complete_artwork(widget)
    widget.screenshot(path='/tmp/salary-counter-widget-preview.png', animations='disabled', omit_background=True)

    # Desktop widget hides the 4 top-right buttons and uses native right-click context menu.
    for btn_id in ['gear', 'pin', 'minus', 'quit']:
        assert widget.locator('#' + btn_id).evaluate('(e)=>getComputedStyle(e).display') == 'none', btn_id
    widget.evaluate("""() => {
      window.__ctxOpened = 0;
      window.salaryApp = { ...window.salaryApp, showContextMenu: async () => { window.__ctxOpened++; return true; } };
      window.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    }""")
    widget.wait_for_timeout(80)
    assert widget.evaluate('window.__ctxOpened') == 1, '右键未触发原生菜单'

    # Verify macOS menu bar mood emojis across work phases
    mac_morning = widget.evaluate("window.__formatMacMenuBarTitle(calc(new Date('2026-11-20T09:00:00')))")
    mac_lunch = widget.evaluate("window.__formatMacMenuBarTitle(calc(new Date('2026-11-20T12:30:00')))")
    mac_sleepy = widget.evaluate("window.__formatMacMenuBarTitle(calc(new Date('2026-11-20T14:00:00')))")
    mac_tired = widget.evaluate("window.__formatMacMenuBarTitle(calc(new Date('2026-11-20T15:30:00')))")
    mac_sprint = widget.evaluate("window.__formatMacMenuBarTitle(calc(new Date('2026-11-20T16:45:00')))")
    assert mac_morning.startswith('☕ ') and mac_lunch.startswith('🍱 '), (mac_morning, mac_lunch)
    assert mac_sleepy.startswith('😪 ') and mac_tired.startswith('😮‍💨 '), (mac_sleepy, mac_tired)
    assert mac_sprint == '🏃 45:00', mac_sprint

    for width in [320,520,760]:
        widget.set_viewport_size({'width':width,'height':round(width*1068/1060)})
        widget.wait_for_function("w => Math.abs(document.querySelector('#viewport').getBoundingClientRect().width-w)<1.5",arg=width)
        vp=widget.locator('#viewport').bounding_box()
        assert vp and abs(vp['width']-width)<1.5, vp
        assert_complete_artwork(widget)
    # Independent settings panel retains readable typography, a scrolling body, style picker and macOS toggle.
    popup=browser.new_page(viewport={'width':560,'height':640})
    popup.on('pageerror',lambda error: errors.append('popup: '+str(error)))
    native = """<script>
window.__calls=[];window.__prefs={platform:'macos',widgetEnabled:true,widgetStyle:'standard',widgetWidth:520,widgetWidths:{standard:520,balanced:460,compact:380,minimal:300},alwaysOnTop:false,macMenuBarCountdown:true};
window.__TAURI__={core:{invoke:async(name,args={})=>{
 window.__calls.push([name,args]);
 if(name==='settings_load')return null;
 if(name==='get_window_mode')return 'widget';
 if(name==='get_widget_enabled')return window.__prefs.widgetEnabled;
 if(name==='get_desktop_prefs')return {...window.__prefs};
 if(name==='set_always_on_top')window.__prefs.alwaysOnTop=args.value;
 if(name==='set_widget_width')window.__prefs.widgetWidth=args.value;
 if(name==='set_widget_style')window.__prefs.widgetStyle=args.style;
 if(name==='set_mac_menu_bar_countdown')window.__prefs.macMenuBarCountdown=args.value;
 if(name==='set_widget_enabled')window.__prefs.widgetEnabled=args.enabled;
 if(name==='settings_save')window.__saved=args.value;
 return true;
}},event:{listen:async()=>()=>{}}};
window.__salarySettings=true;
</script>"""
    popup.set_content(html.replace('<head>','<head>'+native))
    popup.wait_for_selector('#modal.show')
    assert popup.locator('#save').is_visible()
    assert popup.locator('#save').bounding_box()['y']<640
    assert not popup.locator('#viewport').is_visible()
    assert popup.locator('.style-opt').count()==4
    assert popup.locator('#setMacMenuBar').is_visible()
    popup.locator('#setNet').fill('7350.125')
    assert popup.locator('.settings-nav button').count()==4
    popup.locator('.settings-nav button').nth(3).click()
    popup.locator('.style-opt[data-style-id="minimal"]').click()
    assert popup.locator('#setWidth').input_value()=='300'
    popup.locator('#setMacMenuBar').uncheck()
    popup.locator('#setPinned').check()
    popup.locator('#save').click()
    popup.wait_for_function("window.__saved && window.__calls.some(x=>x[0]==='close_settings')")
    assert popup.evaluate('__saved.monthlyNet')==7350.125
    assert popup.evaluate('__prefs.widgetStyle')=='minimal'
    assert popup.evaluate('__prefs.widgetWidth')==300
    assert popup.evaluate('__prefs.macMenuBarCountdown') is False
    assert popup.evaluate('__prefs.alwaysOnTop') is True
    assert not errors, errors
    print('CALC_AND_UI_TESTS_OK',len(cases),'calculation cases; 4 widget styles; right-click menu; macOS menu bar moods; settings popup; JS errors=0')
    browser.close()
