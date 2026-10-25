// Resolución de rutas de imagen respecto al fichero abierto.

let baseDir = null;

export function setBaseDir(dir) {
  baseDir = dir;
}
export const getBaseDir = () => baseDir;

export const dirname = (p) => p.replace(/[\\/][^\\/]*$/, '');

// Ruta de Windows (con letra de unidad o UNC) -> URL file://
export function fileUrl(p) {
  const s = p.replace(/\\/g, '/');
  const enc = (parts) => parts.map((x, i) => (i === 0 && /^[a-zA-Z]:$/.test(x) ? x : encodeURIComponent(x))).join('/');
  if (s.startsWith('//')) return 'file:' + '//' + enc(s.slice(2).split('/'));
  return 'file:///' + enc(s.split('/'));
}

export function resolveImageSrc(src) {
  if (!src) return null;
  if (/^(https?:|data:|file:)/i.test(src)) return src;
  if (/^[a-zA-Z]:[\\/]/.test(src) || src.startsWith('\\\\')) return fileUrl(src);
  if (!baseDir) return null;
  try {
    return new URL(src, fileUrl(baseDir) + '/').href;
  } catch {
    return null;
  }
}

// Ruta relativa de `target` respecto al fichero `mdPath` (con / y espacios codificables).
// Si están en unidades distintas devuelve la ruta absoluta.
export function relativeTo(mdPath, target) {
  const a = dirname(mdPath).replace(/\\/g, '/').split('/');
  const b = target.replace(/\\/g, '/').split('/');
  if (a[0].toLowerCase() !== b[0].toLowerCase()) return target.replace(/\\/g, '/');
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i].toLowerCase() === b[i].toLowerCase()) i++;
  return [...Array(a.length - i).fill('..'), ...b.slice(i)].join('/');
}
