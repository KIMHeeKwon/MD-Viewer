const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
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
