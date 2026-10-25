const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  readFile: (p) => ipcRenderer.invoke('file:read', p),
  writeFile: (args) => ipcRenderer.invoke('file:write', args),
  openDialog: () => ipcRenderer.invoke('file:openDialog'),
  saveAsDialog: (name) => ipcRenderer.invoke('file:saveAsDialog', name),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  pickImage: () => ipcRenderer.invoke('file:pickImage'),
  clipboardRead: () => ipcRenderer.invoke('clipboard:read'),
  clipboardWrite: (t) => ipcRenderer.invoke('clipboard:write', t),
  setTitle: (t) => ipcRenderer.invoke('window:setTitle', t),
  onOpenFile: (cb) => ipcRenderer.on('open-file', (_e, f) => cb(f)),
});
