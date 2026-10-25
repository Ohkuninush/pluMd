// Registro de skins. Un skin cambia el aspecto sin tocar la distribución. Puede ser:
//  - una hoja CSS (css: 'ruta.css') que redefine los tokens de forma y color (--r-*, --font-*, --bg…)
//    y ajusta formas concretas, o
//  - solo variables (vars para el modo claro, varsDark para el oscuro): lo que antes llamábamos "paleta".
// Los skins incluidos usan el mismo mecanismo que usan los de los plugins: registerSkin({ id, name, ... }).
import { emit } from './plugins/registry.js';

const skins = new Map();

const cssBlock = (selector, vars) => `${selector} {\n${Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}\n`;

export function registerSkin(skin) {
  const s = { icon: 'palette', css: null, description: '', owner: 'core', ...skin };
  skins.set(s.id, s);
  // Skin solo de variables: se inyecta su CSS; solo se aplica cuando data-skin vale su id.
  if (s.vars || s.varsDark) {
    const style = document.createElement('style');
    style.dataset.skinStyle = s.id;
    style.textContent =
      (s.vars ? cssBlock(`:root[data-skin='${s.id}']`, s.vars) : '') +
      (s.varsDark ? cssBlock(`:root[data-skin='${s.id}'][data-theme='dark']`, s.varsDark) : '');
    document.head.appendChild(style);
  }
  emit('registry:skins');
  return { dispose: () => unregisterSkin(s.id) };
}

export function unregisterSkin(id) {
  if (!skins.has(id)) return;
  const wasActive = document.documentElement.dataset.skin === id;
  skins.delete(id);
  document.querySelectorAll(`style[data-skin-style="${id}"], link[data-skin="${id}"]`).forEach((n) => n.remove());
  if (wasActive) document.documentElement.dataset.skin = 'plumd';
  emit('registry:skins');
}

export const listSkins = () => [...skins.values()];
export const getSkin = (id) => skins.get(id) || skins.get('plumd');
export const hasSkin = (id) => skins.has(id);

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
