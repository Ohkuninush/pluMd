// Colores personalizables del documento. Se guardan por skin y tema (p. ej. "mac:dark") en el navegador
// y se aplican como variables CSS (--c-*) que el CSS usa con la paleta del skin como valor por defecto.

export const COLOR_ITEMS = [
  ['text', 'Texto estándar'],
  ['bg', 'Fondo del documento'],
  ['h1', 'Título 1'],
  ['h2', 'Título 2'],
  ['h3', 'Título 3'],
  ['h4', 'Título 4'],
  ['h5', 'Título 5'],
  ['h6', 'Título 6'],
  ['bold', 'Negrita'],
  ['italic', 'Cursiva'],
  ['link', 'Vínculos'],
  ['code', 'Código en línea'],
  ['quote', 'Citas'],
];

// Variable de la paleta del skin que da el valor por defecto de cada elemento.
const DEFAULT_VAR = {
  text: '--text', bg: '--bg', h1: '--text', h2: '--text', h3: '--text', h4: '--text', h5: '--text', h6: '--muted',
  bold: '--text', italic: '--text', link: '--accent', code: '--text', quote: '--muted',
};

let scope = 'plumd:light';

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem('colors2') || '{}');
  } catch {
    return {};
  }
};

const writeAll = (all) => {
  try {
    localStorage.setItem('colors2', JSON.stringify(all));
  } catch {
    /* sin almacenamiento: los colores valen solo para esta sesión */
  }
};

export const savedColors = () => readAll()[scope] || {};

// Valor por defecto del skin y tema activos (se lee de las variables CSS, que no incluyen los --c-*).
export function defaultOf(key) {
  return getComputedStyle(document.documentElement).getPropertyValue(DEFAULT_VAR[key]).trim() || '#000000';
}

export const colorOf = (key) => savedColors()[key] || defaultOf(key);

export function applyColors() {
  const saved = savedColors();
  const root = document.documentElement.style;
  for (const [k] of COLOR_ITEMS) {
    if (saved[k]) root.setProperty(`--c-${k}`, saved[k]);
    else root.removeProperty(`--c-${k}`);
  }
}

// Se llama al cambiar de skin o de tema: cada combinación tiene sus propios colores.
export function setScope(skin, theme) {
  scope = `${skin}:${theme}`;
  applyColors();
}

// value = null restablece el valor predeterminado.
export function setColor(key, value) {
  const all = readAll();
  all[scope] = all[scope] || {};
  if (value) all[scope][key] = value;
  else delete all[scope][key];
  writeAll(all);
  applyColors();
}

export function resetColors() {
  const all = readAll();
  delete all[scope];
  writeAll(all);
  applyColors();
}
