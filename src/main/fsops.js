// Operaciones de ficheros del panel de carpetas.
// Reglas de seguridad:
//  - Solo se opera dentro de la carpeta raíz que el usuario eligió.
//  - Solo documentos de texto (.md, .markdown, .txt); nunca se renombra ni se borra una carpeta.
//  - Crear y copiar nunca sobrescriben nada.
//  - Borrar solo envía a la Papelera de reciclaje, y NUNCA en unidades de red (ahí no hay Papelera
//    y el borrado sería definitivo). Si no se puede determinar el tipo de unidad, se trata como red.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const MD_RE = /\.(md|markdown|txt)$/i;
const SKIP_DIRS = new Set(['node_modules', '$recycle.bin', 'system volume information']);
const INVALID = /[<>:"/\\|?*\x00-\x1f]/;
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

const msg = {
  outside: 'La ruta está fuera de la carpeta abierta.',
  notDoc: 'Solo se pueden gestionar documentos .md, .markdown o .txt.',
  exists: 'Ya existe un documento con ese nombre.',
  invalidName: 'El nombre no es válido: no puede estar vacío ni llevar \\ / : * ? " < > |',
  network: 'En unidades de red no se puede borrar desde PluMd (no hay Papelera y no se podría recuperar). Hazlo desde el Explorador de Windows.',
};

// Tipo de unidad de Windows (4 = unidad de red). Devuelve null si no se puede saber.
function windowsDriveType(letter) {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', `(Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='${letter.toUpperCase()}:'").DriveType`],
      { timeout: 8000, windowsHide: true },
      (err, out) => {
        const n = parseInt(String(out || '').trim(), 10);
        resolve(err || Number.isNaN(n) ? null : n);
      },
    );
  });
}

function createFsOps({ trash, driveType = windowsDriveType } = {}) {
  let root = null;
  const driveCache = new Map();

  const norm = (p) => path.resolve(p).toLowerCase();
  const inRoot = (p) => {
    if (!root || !p) return false;
    const n = norm(p);
    return n === root.key || n.startsWith(root.key + path.sep);
  };

  async function isNetworkPath(p) {
    const s = String(p || '');
    if (/^\\\\/.test(s) || /^\/\//.test(s)) return true; // ruta UNC
    const m = /^([a-zA-Z]):/.exec(path.resolve(s));
    if (!m) return true; // sin letra de unidad reconocible: prudencia
    const letter = m[1].toLowerCase();
    if (!driveCache.has(letter)) driveCache.set(letter, driveType(letter));
    const t = await driveCache.get(letter);
    return t === null || t === 4;
  }

  function cleanName(raw, keepExt) {
    let name = String(raw || '').trim();
    if (!name || name === '.' || name === '..' || INVALID.test(name) || RESERVED.test(name) || name.length > 200) return null;
    if (!MD_RE.test(name)) name += keepExt || '.md';
    return name;
  }

  async function exists(p) {
    try {
      await fs.promises.access(p);
      return true;
    } catch {
      return false;
    }
  }

  return {
    isNetworkPath,
    inRoot,
    getRoot: () => root && root.path,

    async setRoot(dir) {
      const st = await fs.promises.stat(dir);
      if (!st.isDirectory()) throw new Error('No es una carpeta.');
      const p = path.resolve(dir);
      root = { path: p, key: norm(p) };
      return { path: p, network: await isNetworkPath(p) };
    },

    async listDir(dir) {
      if (!inRoot(dir)) throw new Error(msg.outside);
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      const out = [];
      for (const e of entries) {
        if (e.name.startsWith('.') || SKIP_DIRS.has(e.name.toLowerCase())) continue;
        const full = path.join(dir, e.name);
        let isDir = e.isDirectory();
        let isFile = e.isFile();
        if (e.isSymbolicLink()) {
          try {
            const st = await fs.promises.stat(full);
            isDir = st.isDirectory();
            isFile = st.isFile();
          } catch {
            continue;
          }
        }
        if (isDir) out.push({ name: e.name, path: full, dir: true });
        else if (isFile && MD_RE.test(e.name)) out.push({ name: e.name, path: full, dir: false });
      }
      const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
      out.sort((a, b) => (a.dir === b.dir ? collator.compare(a.name, b.name) : a.dir ? -1 : 1));
      return out;
    },

    // Crea un documento vacío. Nunca sobrescribe.
    async create(dir, rawName) {
      if (!inRoot(dir)) return { ok: false, error: msg.outside };
      const name = cleanName(rawName);
      if (!name) return { ok: false, error: msg.invalidName };
      const target = path.join(dir, name);
      try {
        await fs.promises.writeFile(target, '', { flag: 'wx' });
        return { ok: true, path: target };
      } catch (e) {
        return { ok: false, error: e.code === 'EEXIST' ? msg.exists : e.message };
      }
    },

    // Cambia el nombre dentro de la misma carpeta. Nunca sobrescribe otro documento.
    async rename(p, rawName) {
      if (!inRoot(p)) return { ok: false, error: msg.outside };
      if (!MD_RE.test(p)) return { ok: false, error: msg.notDoc };
      const name = cleanName(rawName, path.extname(p));
      if (!name) return { ok: false, error: msg.invalidName };
      const target = path.join(path.dirname(p), name);
      if (target === p) return { ok: true, path: p };
      // Un cambio solo de mayúsculas es el mismo fichero en Windows: se permite.
      if (target.toLowerCase() !== p.toLowerCase() && (await exists(target))) return { ok: false, error: msg.exists };
      try {
        await fs.promises.rename(p, target);
        return { ok: true, path: target };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },

    // Copia un documento a una carpeta. Si el nombre ya existe, añade " - copia". Nunca sobrescribe.
    async copy(src, destDir) {
      if (!inRoot(src) || !inRoot(destDir)) return { ok: false, error: msg.outside };
      if (!MD_RE.test(src)) return { ok: false, error: msg.notDoc };
      try {
        if (!(await fs.promises.stat(src)).isFile()) return { ok: false, error: msg.notDoc };
        const ext = path.extname(src);
        const base = path.basename(src, ext);
        for (let n = 0; n < 200; n++) {
          const name = n === 0 ? base + ext : `${base} - copia${n > 1 ? ' ' + n : ''}${ext}`;
          const target = path.join(destDir, name);
          try {
            await fs.promises.copyFile(src, target, fs.constants.COPYFILE_EXCL);
            return { ok: true, path: target };
          } catch (e) {
            if (e.code !== 'EEXIST') throw e;
          }
        }
        return { ok: false, error: msg.exists };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },

    // Envía un documento a la Papelera. Se niega en unidades de red y con carpetas.
    async remove(p) {
      if (!inRoot(p)) return { ok: false, error: msg.outside };
      if (!MD_RE.test(p)) return { ok: false, error: msg.notDoc };
      if (await isNetworkPath(p)) return { ok: false, error: msg.network, network: true };
      try {
        if (!(await fs.promises.stat(p)).isFile()) return { ok: false, error: msg.notDoc };
        await trash(p);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
  };
}

module.exports = { createFsOps, MD_RE, msg };
