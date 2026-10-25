// Se ejecuta antes de pintar nada: fija el tema y el skin guardados para evitar parpadeos.
(function () {
  var theme = null;
  var skin = null;
  try {
    theme = localStorage.getItem('theme');
    skin = localStorage.getItem('skin');
  } catch (e) { /* sin almacenamiento: valores por defecto */ }
  if (!theme) theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  var SKINS = { windows: 'skins/windows.css', mac: 'skins/mac.css' }; // 'plumd' es el aspecto base
  if (!SKINS[skin]) skin = 'plumd';
  var root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.skin = skin;
  if (SKINS[skin]) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = SKINS[skin];
    link.dataset.skin = skin;
    document.head.appendChild(link);
  }
})();
