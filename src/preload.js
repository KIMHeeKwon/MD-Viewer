const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFolder: () => ipcRenderer.invoke('folder:open'),
  readFile: (p) => ipcRenderer.invoke('file:read', p),
  setWatched: (paths) => ipcRenderer.send('watch:set', paths),
  onFileChanged: (cb) => ipcRenderer.on('file:changed', (_e, p) => cb(p)),
  onMenu: (channel, cb) => {
    if (channel === 'menu:open-folder' || channel === 'menu:toggle-theme') {
      ipcRenderer.on(channel, () => cb());
    }
  },
});
