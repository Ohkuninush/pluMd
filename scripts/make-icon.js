// Genera los iconos PNG a partir de assets/logo.svg usando el propio Chromium de Electron.
// Uso: node_modules/.bin/electron scripts/make-icon.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const root = path.join(__dirname, '..');
  const svg = fs.readFileSync(path.join(root, 'assets', 'logo.svg'), 'utf8');
  const size = 512;
  const win = new BrowserWindow({
    width: size,
    height: size,
    show: false,
    frame: false,
    transparent: true,
    useContentSize: true,
    webPreferences: { offscreen: true },
  });
  const html = `<html><body style="margin:0;background:transparent;overflow:hidden">${svg}</body></html>`;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 500));
  const png = (await win.webContents.capturePage()).toPNG();
  fs.mkdirSync(path.join(root, 'build'), { recursive: true });
  fs.writeFileSync(path.join(root, 'build', 'icon.png'), png); // icono de la app y del instalador
  fs.writeFileSync(path.join(root, 'assets', 'logo.png'), png); // para README y redes
  console.log('icono generado:', png.length, 'bytes');
  app.quit();
});
