const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  readFile: (p) => ipcRenderer.invoke('file:read', p),
  writeFile: (args) => ipcRenderer.invoke('file:write', args),
  openDialog: () => ipcRenderer.invoke('file:openDialog'),
  saveAsDialog: (name) => ipcRenderer.invoke('file:saveAsDialog', name),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  pickImage: () => ipcRenderer.invoke('file:pickImage'),
  clipboardRead: () => ipcRenderer.invoke('clipboard:read'),
  clipboardWrite: (t) => ipcRenderer.invoke('clipboard:write', t),
  appInfo: () => ipcRenderer.invoke('app:info'),
  // Ruta real de un fichero soltado en la ventana (Electron ya no expone file.path).
  pathForFile: (f) => webUtils.getPathForFile(f),
  pickFolder: () => ipcRenderer.invoke('fs:pickFolder'),
  isDir: (p) => ipcRenderer.invoke('fs:isDir', p),
  fsSetRoot: (p) => ipcRenderer.invoke('fs:setRoot', p),
  fsListDir: (p) => ipcRenderer.invoke('fs:listDir', p),
  fsCreate: (dir, name) => ipcRenderer.invoke('fs:create', dir, name),
  fsRename: (p, name) => ipcRenderer.invoke('fs:rename', p, name),
  fsCopy: (src, dir) => ipcRenderer.invoke('fs:copy', src, dir),
  fsDelete: (p) => ipcRenderer.invoke('fs:delete', p),
  reveal: (p) => ipcRenderer.invoke('fs:reveal', p),
  setTitle: (t) => ipcRenderer.invoke('window:setTitle', t),
  onOpenFile: (cb) => ipcRenderer.on('open-file', (_e, f) => cb(f)),
});
