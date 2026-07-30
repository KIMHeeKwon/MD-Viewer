const { app, BrowserWindow, ipcMain, dialog, Menu, shell, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const chokidar = require('chokidar');

const FILE_EXT = /\.(md|markdown|mdown|pdf)$/i;
const isMac = process.platform === 'darwin';

app.setName('MD Viewer'); // 개발 모드에서 메뉴 라벨 보정 (번들 이름은 패키징 시 productName 적용)

let win = null;
let windowReady = false;
let pendingOpenPath = null; // 창이 준비되기 전에 들어온 파일 열기 요청 보관
const watchers = new Map(); // path -> FSWatcher

// Finder/탐색기에서 넘어온 파일 경로를 렌더러로 전달 (창이 준비된 뒤에만)
function requestOpen(filePath) {
  if (!filePath) return;
  if (windowReady && win) win.webContents.send('open-file', filePath);
  else pendingOpenPath = filePath;
}

// argv에서 실제 존재하는 마크다운 파일 경로를 추출 (Windows 더블클릭)
function fileFromArgv(argv) {
  return argv.find((a) => /\.(md|markdown|mdown)$/i.test(a) && fs.existsSync(a)) || null;
}

function readTree(dir, depth = 0) {
  if (depth > 8) return [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const children = readTree(full, depth + 1);
      // 문서(md/pdf)가 하나도 없는 폴더는 트리에서 제외
      if (children.length) out.push({ type: 'dir', name: e.name, path: full, children });
    } else if (FILE_EXT.test(e.name)) {
      out.push({ type: 'file', name: e.name, path: full });
    }
  }
  out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, 'ko') : a.type === 'dir' ? -1 : 1));
  return out;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: '#1a1b26',
    title: 'MD Viewer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.on('did-finish-load', () => {
    windowReady = true;
    if (pendingOpenPath) {
      win.webContents.send('open-file', pendingOpenPath);
      pendingOpenPath = null;
    }
  });
  win.on('closed', () => { win = null; windowReady = false; });
}

// 단일 인스턴스 — 두 번째 실행(파일 더블클릭)은 첫 창으로 경로를 넘기고 종료
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) app.quit();

app.on('second-instance', (_e, argv) => {
  requestOpen(fileFromArgv(argv));
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});

// macOS: Finder에서 .md 더블클릭 / Dock에 드롭
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  requestOpen(filePath);
});

function buildMenu() {
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: '파일',
      submenu: [
        {
          label: '폴더 열기…',
          accelerator: 'CmdOrCtrl+O',
          click: () => win && win.webContents.send('menu:open-folder'),
        },
        {
          label: 'PDF로 내보내기…',
          accelerator: 'CmdOrCtrl+E',
          click: () => win && win.webContents.send('menu:export-pdf'),
        },
        {
          label: 'HTML로 내보내기…',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => win && win.webContents.send('menu:export-html'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    {
      label: '보기',
      submenu: [
        {
          label: '찾기…',
          accelerator: 'CmdOrCtrl+F',
          click: () => win && win.webContents.send('menu:find'),
        },
        {
          label: '전체 검색…',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => win && win.webContents.send('menu:search-project'),
        },
        {
          label: '연결 그래프…',
          accelerator: 'CmdOrCtrl+Shift+G',
          click: () => win && win.webContents.send('menu:graph'),
        },
        {
          label: '본문 글자 크기',
          submenu: [
            { label: '작게', click: () => win && win.webContents.send('menu:font-size', 13) },
            { label: '보통', click: () => win && win.webContents.send('menu:font-size', 15) },
            { label: '크게', click: () => win && win.webContents.send('menu:font-size', 17) },
            { label: '아주 크게', click: () => win && win.webContents.send('menu:font-size', 20) },
            { type: 'separator' },
            { label: '한 단계 크게', accelerator: 'CmdOrCtrl+Alt+Plus', click: () => win && win.webContents.send('menu:font-size', '+') },
            { label: '한 단계 작게', accelerator: 'CmdOrCtrl+Alt+-', click: () => win && win.webContents.send('menu:font-size', '-') },
          ],
        },
        {
          label: '읽기 폭',
          submenu: [
            { label: '좁게', click: () => win && win.webContents.send('menu:read-width', 720) },
            { label: '보통', click: () => win && win.webContents.send('menu:read-width', 860) },
            { label: '넓게', click: () => win && win.webContents.send('menu:read-width', 1080) },
            { label: '창 전체', click: () => win && win.webContents.send('menu:read-width', 0) },
          ],
        },
        {
          label: '테마 전환',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => win && win.webContents.send('menu:toggle-theme'),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
    {
      label: '도움말',
      submenu: [
        { label: '새 버전 확인…', click: () => win && win.webContents.send('menu:check-update') },
        {
          label: '릴리스 페이지 열기',
          click: () => shell.openExternal(RELEASES_PAGE),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle('folder:open', async () => {
  const res = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  if (res.canceled || !res.filePaths.length) return null;
  const root = res.filePaths[0];
  return { root, name: path.basename(root), tree: readTree(root) };
});

// 대화상자 없이 경로로 폴더 스캔 (세션 복원용)
ipcMain.handle('folder:openPath', async (_e, dirPath) => {
  try {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return { error: 'not found' };
    return { root: dirPath, name: path.basename(dirPath), tree: readTree(dirPath) };
  } catch (err) {
    return { error: String(err.message || err) };
  }
});

ipcMain.handle('file:read', async (_e, filePath) => {
  try {
    return { content: fs.readFileSync(filePath, 'utf8') };
  } catch (err) {
    return { error: String(err.message || err) };
  }
});

// PDF 원본 바이트 — 렌더러에는 Uint8Array로 전달된다
ipcMain.handle('file:readBinary', async (_e, filePath) => {
  try {
    return { data: fs.readFileSync(filePath) };
  } catch (err) {
    return { error: String(err.message || err) };
  }
});

// 폴더 내 모든 마크다운 파일에서 줄 단위 검색 (전체 검색용)
ipcMain.handle('search:project', async (_e, { root, query }) => {
  const q = (query || '').toLowerCase();
  if (!root || q.length < 2) return { results: [], capped: false };

  const files = [];
  (function walk(dir, depth) {
    if (depth > 8) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else if (/\.(md|markdown|mdown)$/i.test(e.name)) files.push(full);
    }
  })(root, 0);

  const MAX_TOTAL = 300;
  const results = [];
  let total = 0;
  for (const f of files) {
    if (total >= MAX_TOTAL) break;
    let content;
    try { content = fs.readFileSync(f, 'utf8'); } catch { continue; }
    const lines = content.split(/\r?\n/);
    const matches = [];
    for (let i = 0; i < lines.length && matches.length < 20 && total < MAX_TOTAL; i++) {
      if (lines[i].toLowerCase().includes(q)) {
        matches.push({ line: i + 1, text: lines[i].trim().slice(0, 300) });
        total++;
      }
    }
    if (matches.length) results.push({ path: f, name: path.basename(f), matches });
  }
  return { results, capped: total >= MAX_TOTAL };
});

/* ---------- 업데이트 확인 ----------
 * Windows·Linux(AppImage): electron-updater로 내려받아 재시작 시 설치한다.
 * macOS: Apple 코드 서명이 없어 Squirrel이 업데이트를 거부하므로 새 버전 '알림'만 한다.
 * deb로 설치한 Linux도 자동 설치 대상이 아니라 알림만 한다 (패키지 관리자 영역).
 * 조회는 렌더러가 요청할 때만 일어난다 — 사용자가 자동 확인을 끄면 아무 요청도 하지 않는다.
 */
const RELEASES_PAGE = 'https://github.com/KIMHeeKwon/MD-Viewer/releases/latest';
const canSelfUpdate = () => process.platform === 'win32'
  || (process.platform === 'linux' && !!process.env.APPIMAGE);

function latestTagFromGitHub() {
  return new Promise((resolve, reject) => {
    const req = net.request({
      method: 'GET',
      url: 'https://api.github.com/repos/KIMHeeKwon/MD-Viewer/releases/latest',
    });
    req.setHeader('Accept', 'application/vnd.github+json');
    req.setHeader('User-Agent', 'MD-Viewer');
    let body = '';
    req.on('response', (res) => {
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(body).tag_name || null); }
        catch (err) { reject(err); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// "1.2.3" 비교 — 왼쪽이 더 새 버전이면 true
function isNewer(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

let updaterWired = false;

ipcMain.handle('update:check', async () => {
  const current = app.getVersion();
  if (!app.isPackaged) return { status: 'dev', current };

  if (canSelfUpdate()) {
    try {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;
      if (!updaterWired) {
        updaterWired = true;
        autoUpdater.on('update-downloaded', (info) => {
          if (win) win.webContents.send('update:state', { status: 'downloaded', version: info.version, current });
        });
        autoUpdater.on('error', (err) => {
          if (win) win.webContents.send('update:state', { status: 'error', message: String(err && err.message || err) });
        });
      }
      const r = await autoUpdater.checkForUpdates();
      const version = r && r.updateInfo && r.updateInfo.version;
      if (version && isNewer(version, current)) return { status: 'downloading', version, current };
      return { status: 'latest', current };
    } catch (err) {
      return { status: 'error', message: String(err && err.message || err), current };
    }
  }

  // 알림 전용 경로 (macOS, deb 설치 Linux)
  try {
    const tag = await latestTagFromGitHub();
    if (tag && isNewer(tag, current)) return { status: 'notify', version: tag.replace(/^v/, ''), current };
    return { status: 'latest', current };
  } catch (err) {
    return { status: 'error', message: String(err && err.message || err), current };
  }
});

ipcMain.handle('update:install', async () => {
  if (!canSelfUpdate()) return false;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.quitAndInstall();
    return true;
  } catch { return false; }
});

ipcMain.handle('update:openPage', async () => { shell.openExternal(RELEASES_PAGE); return true; });

// 폴더 전체의 위키링크 연결 관계를 노드·간선으로 수집 (연결 그래프)
ipcMain.handle('graph:build', async (_e, { root }) => {
  if (!root) return { nodes: [], edges: [], unresolved: 0 };

  const files = [];
  (function walk(dir, depth) {
    if (depth > 8) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else if (/\.(md|markdown|mdown)$/i.test(e.name)) files.push(full);
    }
  })(root, 0);

  const stripExt = (n) => n.replace(/\.(md|markdown|mdown)$/i, '');
  // 파일명(확장자 제외, 소문자) → 경로. 위키링크는 파일명으로 해석된다.
  const index = new Map();
  for (const f of files) index.set(stripExt(path.basename(f)).toLowerCase(), f);

  const nodes = files.map((f) => ({
    path: f,
    name: stripExt(path.basename(f)),
    dir: path.dirname(f) === root ? '' : path.relative(root, path.dirname(f)),
  }));

  const edges = [];
  const seen = new Set();
  let unresolved = 0;
  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf8'); } catch { continue; }
    if (!content.includes('[[')) continue;
    // 코드 블록·인라인 코드 안의 [[...]]는 문법 예시이므로 제외한다
    const prose = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    for (const m of prose.matchAll(/\[\[([^\]\n|]+)(?:\|[^\]\n]*)?\]\]/g)) {
      const key = stripExt(m[1].trim()).toLowerCase();
      const target = index.get(key);
      if (!target) { unresolved++; continue; }
      if (target === f) continue; // 자기 참조 제외
      const id = `${f}\u0000${target}`;
      if (seen.has(id)) continue;
      seen.add(id);
      edges.push({ from: f, to: target });
    }
  }
  return { nodes, edges, unresolved };
});

// 이 문서를 [[위키링크]]로 참조하는 다른 문서 찾기 (백링크)
ipcMain.handle('links:backlinks', async (_e, { root, target }) => {
  if (!root || !target) return { results: [] };
  const targetKey = path.basename(target).replace(/\.(md|markdown|mdown)$/i, '').toLowerCase();

  const files = [];
  (function walk(dir, depth) {
    if (depth > 8) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else if (/\.(md|markdown|mdown)$/i.test(e.name)) files.push(full);
    }
  })(root, 0);

  const results = [];
  for (const f of files) {
    if (f === target) continue; // 자기 자신 제외
    let content;
    try { content = fs.readFileSync(f, 'utf8'); } catch { continue; }
    if (!content.includes('[[')) continue;
    const lines = content.split(/\r?\n/);
    const matches = [];
    for (let i = 0; i < lines.length && matches.length < 10; i++) {
      for (const m of lines[i].matchAll(/\[\[([^\]\n|]+)(?:\|[^\]\n]*)?\]\]/g)) {
        const key = m[1].trim().replace(/\.(md|markdown|mdown)$/i, '').toLowerCase();
        if (key === targetKey) {
          matches.push({ line: i + 1, text: lines[i].trim().slice(0, 300) });
          break;
        }
      }
    }
    if (matches.length) results.push({ path: f, name: path.basename(f), matches });
  }
  return { results };
});

// 렌더링 결과를 자체 완결 HTML 한 파일로 저장 (스타일·수식 폰트·이미지 내장)
ipcMain.handle('html:export', async (_e, { suggestedName, title, bodyHtml }) => {
  const res = await dialog.showSaveDialog(win, {
    defaultPath: suggestedName,
    filters: [{ name: 'HTML', extensions: ['html'] }],
  });
  if (res.canceled || !res.filePath) return null;

  const distDir = path.join(__dirname, '..', 'renderer-dist');
  const MIME = {
    '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  };
  const dataUri = (file) => {
    const ext = path.extname(file).toLowerCase();
    return `data:${MIME[ext] || 'application/octet-stream'};base64,${fs.readFileSync(file).toString('base64')}`;
  };

  try {
    let css = fs.readFileSync(path.join(distDir, 'renderer.css'), 'utf8');
    // @font-face의 src를 내장한 woff2 하나로 교체한다.
    // (수식이 없으면 폰트를 통째로 빼고, ttf/woff 대체본은 깨진 참조로 남지 않게 제거)
    const needsMath = bodyHtml.includes('katex');
    css = css.replace(/@font-face\s*\{([^}]*)\}/g, (block, inner) => {
      if (!needsMath) return '';
      const refs = [...inner.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1]);
      const woff2 = refs.map((r) => path.join(distDir, path.basename(r.split('?')[0])))
        .find((f) => f.toLowerCase().endsWith('.woff2') && fs.existsSync(f));
      if (!woff2) return '';
      const src = `src:url("${dataUri(woff2)}") format("woff2");`;
      return `@font-face{${inner.replace(/src\s*:[^;]*;?/g, '')}${src}}`;
    });

    // 문서 이미지도 내장 (파일당 5MB 상한)
    const body = bodyHtml.replace(/src="file:\/\/([^"]+)"/g, (whole, p) => {
      try {
        const f = decodeURI(p);
        if (!fs.existsSync(f) || fs.statSync(f).size > 5 * 1024 * 1024) return whole;
        return `src="${dataUri(f)}"`;
      } catch { return whole; }
    });

    const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const html = `<!doctype html>
<html lang="ko" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
${css}
body { padding: 32px 20px; }
.doc-body { margin: 0 auto; }
.wikilink { border-bottom: 1px dashed currentColor; }
</style>
</head>
<body>
<article class="doc-body">
${body}
</article>
</body>
</html>`;
    fs.writeFileSync(res.filePath, html, 'utf8');
    return res.filePath;
  } catch (err) {
    return { error: String(err.message || err) };
  }
});

ipcMain.handle('pdf:export', async (_e, suggestedName) => {
  const res = await dialog.showSaveDialog(win, {
    defaultPath: suggestedName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (res.canceled || !res.filePath) return null;
  try {
    // 인쇄 미디어 CSS(@media print)가 적용된 상태로 렌더링된다
    const data = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
    fs.writeFileSync(res.filePath, data);
    return res.filePath;
  } catch (err) {
    return { error: String(err.message || err) };
  }
});

// 렌더러가 열린 탭 전체 경로를 보내면 감시 목록을 그에 맞춰 동기화한다
ipcMain.on('watch:set', (_e, paths) => {
  const want = new Set(paths);
  for (const [p, w] of watchers) {
    if (!want.has(p)) {
      w.close();
      watchers.delete(p);
    }
  }
  for (const p of want) {
    if (watchers.has(p)) continue;
    const w = chokidar.watch(p, { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 } });
    w.on('change', () => win && win.webContents.send('file:changed', p));
    watchers.set(p, w);
  }
});

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) return;
  createWindow();
  buildMenu();
  // Windows 첫 실행 시 argv로 넘어온 파일 열기 (macOS는 open-file 이벤트가 담당)
  if (!isMac && !pendingOpenPath) requestOpen(fileFromArgv(process.argv));
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
