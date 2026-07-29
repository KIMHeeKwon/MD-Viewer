const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFolder: () => ipcRenderer.invoke('folder:open'),
  openFolderPath: (p) => ipcRenderer.invoke('folder:openPath', p),
  readFile: (p) => ipcRenderer.invoke('file:read', p),
  readFileBinary: (p) => ipcRenderer.invoke('file:readBinary', p),
  setWatched: (paths) => ipcRenderer.send('watch:set', paths),
  exportPdf: (suggestedName) => ipcRenderer.invoke('pdf:export', suggestedName),
  exportHtml: (payload) => ipcRenderer.invoke('html:export', payload),
  searchProject: (root, query) => ipcRenderer.invoke('search:project', { root, query }),
  getBacklinks: (root, target) => ipcRenderer.invoke('links:backlinks', { root, target }),
  buildGraph: (root) => ipcRenderer.invoke('graph:build', { root }),
  // 드롭된 File 객체의 실제 경로 (Electron 32+에서 File.path가 제거됨)
  pathForFile: (file) => webUtils.getPathForFile(file),
  onFileChanged: (cb) => ipcRenderer.on('file:changed', (_e, p) => cb(p)),
  onOpenFile: (cb) => ipcRenderer.on('open-file', (_e, p) => cb(p)),
  onMenu: (channel, cb) => {
    const allowed = [
      'menu:open-folder', 'menu:toggle-theme', 'menu:export-pdf',
      'menu:find', 'menu:search-project', 'menu:read-width', 'menu:export-html',
      'menu:font-size', 'menu:graph',
    ];
    if (allowed.includes(channel)) {
      ipcRenderer.on(channel, (_e, ...args) => cb(...args));
    }
  },
});
