from pathlib import Path
import hashlib, subprocess, zipfile
root = Path(__file__).resolve().parent.parent
tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
paths = {p for p in tracked if p and (root / p).is_file() and p not in {'main.js', 'preload.js'}}
for name in ['Cargo.lock', 'src-tauri/Cargo.lock', 'package-lock.json', 'web/index.html', 'web/settings.html', 'web/assets/logo.svg', 'web/assets/icon.png', 'assets/icon.png', 'assets/icon.ico', 'assets/icon.icns', 'assets/tray.png']:
    if (root / name).is_file(): paths.add(name)
out_dir = root / 'release'
out_dir.mkdir(exist_ok=True)
out = out_dir / 'SalaryCounter-3.1.5-Complete-Project.zip'
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=7) as z:
    for name in sorted(paths): z.write(root / name, f'SalaryCounter-3.1.5/{name}')
with zipfile.ZipFile(out) as z:
    bad = z.testzip()
    if bad: raise RuntimeError(f'ZIP integrity failure: {bad}')
sha = hashlib.sha256(out.read_bytes()).hexdigest()
(out_dir / 'SHA256SUMS-Project.txt').write_text(f'{sha}  {out.name}\n', encoding='utf-8')
print('PROJECT_ARCHIVE_OK', out.stat().st_size, sha)
