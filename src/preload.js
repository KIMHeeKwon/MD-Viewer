const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFolder: () => ipcRenderer.invoke('folder:open'),
  openFolderPath: (p) => ipcRenderer.invoke('folder:openPath', p),
  readFile: (p) => ipcRenderer.invoke('file:read', p),
  readFileBinary: (p) => ipcRenderer.invoke('file:readBinary', p),
  setWatched: (paths) => ipcRenderer.send('watch:set', paths),
  exportPdf: (suggestedName) => ipcRenderer.invoke('pdf:export', suggestedName),
  searchProject: (root, query) => ipcRenderer.invoke('search:project', { root, query }),
  onFileChanged: (cb) => ipcRenderer.on('file:changed', (_e, p) => cb(p)),
  onMenu: (channel, cb) => {
    if (channel === 'menu:open-folder' || channel === 'menu:toggle-theme' || channel === 'menu:export-pdf' || channel === 'menu:find' || channel === 'menu:search-project') {
      ipcRenderer.on(channel, () => cb());
    }
  },
});
