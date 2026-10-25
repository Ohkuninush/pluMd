// Registro de skins. Un skin es un CSS que redefine los tokens de forma y color (--r-*, --font-*, --bg…)
// y ajusta formas concretas; no cambia la distribución. Los skins incluidos usan el mismo mecanismo
// que usarán los de terceros: registerSkin({ id, name, description, icon, css }).

const skins = new Map();

export function registerSkin(skin) {
  skins.set(skin.id, { icon: 'palette', css: null, description: '', ...skin });
}

export const listSkins = () => [...skins.values()];
export const getSkin = (id) => skins.get(id) || skins.get('plumd');

registerSkin({ id: 'plumd', name: 'PluMd', description: 'Aspecto propio de PluMd', icon: 'skinpl' });
registerSkin({ id: 'windows', name: 'Windows', description: 'Inspirado en Windows 11 y Office', icon: 'skinwin', css: 'skins/windows.css' });
registerSkin({ id: 'mac', name: 'Mac', description: 'Inspirado en macOS', icon: 'skinmac', css: 'skins/mac.css' });

// Cambia de skin sin parpadeo: carga la hoja nueva y solo entonces quita la anterior.
// Devuelve una promesa que se resuelve con el id aplicado cuando el skin ya está activo.
export function applySkin(id) {
  const skin = getSkin(id);
  const root = document.documentElement;
  const old = [...document.querySelectorAll('link[data-skin]')];
  return new Promise((resolve) => {
    const finish = () => {
      old.filter((l) => l.dataset.skin !== skin.id).forEach((l) => l.remove());
      root.dataset.skin = skin.id;
      resolve(skin.id);
    };
    if (!skin.css || old.some((l) => l.dataset.skin === skin.id)) return finish();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = skin.css;
    link.dataset.skin = skin.id;
    link.addEventListener('load', finish);
    link.addEventListener('error', finish);
    document.head.appendChild(link);
  });
}
