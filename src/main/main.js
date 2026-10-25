const { app, BrowserWindow, ipcMain, dialog, shell, clipboard } = require('electron');
const fs = require('fs');
const path = require('path');

// Un único proceso: un doble clic con la app abierta abre el fichero en la ventana existente.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

let win = null;
let pendingFile = null;

function fileFromArgs(argv) {
  const args = app.isPackaged ? argv.slice(1) : argv.slice(2);
  return args.find((a) => !a.startsWith('-') && /\.(md|markdown|txt)$/i.test(a) && fs.existsSync(a)) || null;
}

function sendOpen(file) {
  if (win && !win.webContents.isLoading()) win.webContents.send('open-file', file);
  else pendingFile = file;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#ffffff',
    title: 'Visor MD',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  win.webContents.on('did-finish-load', () => {
    if (pendingFile) {
      win.webContents.send('open-file', pendingFile);
      pendingFile = null;
    }
  });
  win.on('closed', () => (win = null));
}

app.on('second-instance', (_e, argv) => {
  const f = fileFromArgs(argv);
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
  if (f) sendOpen(f);
});

// macOS-style open event; también útil si se arranca ya con fichero.
app.on('open-file', (e, f) => {
  e.preventDefault();
  sendOpen(f);
});

app.whenReady().then(() => {
  pendingFile = fileFromArgs(process.argv);
  createWindow();
});

app.on('window-all-closed', () => app.quit());

// ---- IPC: ficheros ----
// La app nunca borra ni mueve ficheros. Solo lee y escribe el que el usuario abre.

ipcMain.handle('file:read', async (_e, file) => {
  const [content, stat] = await Promise.all([fs.promises.readFile(file, 'utf8'), fs.promises.stat(file)]);
  return { path: file, content: content.replace(/^﻿/, ''), mtimeMs: stat.mtimeMs };
});

// Si el fichero cambió en disco desde que se abrió (p. ej. carpeta de red compartida), avisa en vez de pisar.
ipcMain.handle('file:write', async (_e, { path: file, content, expectedMtimeMs, force }) => {
  if (!force && expectedMtimeMs != null) {
    try {
      const stat = await fs.promises.stat(file);
      if (Math.abs(stat.mtimeMs - expectedMtimeMs) > 1) return { ok: false, conflict: true };
    } catch {
      /* el fichero ya no existe: se escribe de nuevo */
    }
  }
  await fs.promises.writeFile(file, content, 'utf8');
  const stat = await fs.promises.stat(file);
  return { ok: true, mtimeMs: stat.mtimeMs };
});

ipcMain.handle('file:openDialog', async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('file:saveAsDialog', async (_e, suggested) => {
  const r = await dialog.showSaveDialog(win, {
    defaultPath: suggested,
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  });
  return r.canceled ? null : r.filePath;
});

// Solo se abren enlaces web y de correo; nunca rutas locales ni otros esquemas.
ipcMain.handle('shell:openExternal', async (_e, url) => {
  try {
    const u = new URL(url);
    if (['http:', 'https:', 'mailto:'].includes(u.protocol)) await shell.openExternal(u.href);
  } catch {
    /* URL no válida: se ignora */
  }
});

ipcMain.handle('file:pickImage', async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] }],
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('clipboard:read', () => clipboard.readText());
ipcMain.handle('clipboard:write', (_e, text) => clipboard.writeText(String(text)));

ipcMain.handle('window:setTitle', (_e, t) => win && win.setTitle(t));
