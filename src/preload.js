const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getNews: () => ipcRenderer.invoke('news:get'),
  refresh: () => ipcRenderer.invoke('news:refresh'),
  getCategories: () => ipcRenderer.invoke('cats:get'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  getDefaults: () => ipcRenderer.invoke('settings:defaults'),
  setSettings: (s) => ipcRenderer.invoke('settings:set', s),
  open: (url) => ipcRenderer.invoke('open', String(url)),
  onUpdated: (cb) => ipcRenderer.on('news:updated', (_e, d) => cb(d)),
});
