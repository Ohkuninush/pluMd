import { registerSkin, unregisterSkin } from '../skins.js';
import { registerStubCommand, disposeOwner, items, setErrorSink, emit } from './registry.js';
import { createApi, API_VERSION } from './api.js';

// Ciclo de vida de los plugins: descubrir (lo hace el proceso principal), activar, desactivar, recargar.
// Un plugin activado es código que se ejecuta en esta ventana con los mismos permisos que la aplicación;
// por eso empiezan desactivados, hay modo seguro y los que fallan varias veces se desactivan solos.

const active = new Map(); // id -> entry
const errors = new Map(); // id -> último error de activación
let host = null;
let info = { plugins: [], safeMode: false, recovered: false, dir: '' };
let nonce = Date.now();

export const getInfo = () => info;
export const isActive = (id) => active.has(id);
export const lastError = (id) => errors.get(id) || null;
export const failedCount = () => errors.size;

const nameOf = (id) => info.plugins.find((p) => p.id === id)?.manifest?.name || id;

async function onPluginError(owner, e) {
  console.error(`[plugin ${owner}]`, e);
  if (owner === 'core' || !active.has(owner)) return;
  const r = await window.api.pluginsFailure(owner);
  host.notify(`El plugin «${nameOf(owner)}» ha dado un error: ${e?.message || e}.${r.disabled ? ` Se ha desactivado tras ${r.failures} fallos.` : ''}`);
  if (r.disabled) {
    deactivatePlugin(owner);
    emit('plugins:changed');
  }
}

export function initPlugins(h) {
  host = h;
  setErrorSink(onPluginError);
}

const startsAtStartup = (m) => {
  const ev = m.activationEvents;
  return !ev || !ev.length || ev.includes('onStartup');
};

async function ensureLoaded(id) {
  const entry = active.get(id);
  if (!entry || entry.loaded) return;
  entry.loaded = true;
  const m = entry.plugin.manifest;
  if (!m.main) return;
  try {
    entry.data = { settings: {}, storage: {}, ...(await window.api.pluginsDataGet(id)) };
    entry.api = createApi({ id, manifest: m, host, entry });
    const mod = await import(`plumd-plugin://${id}/${m.main}?v=${nonce}`);
    entry.module = mod;
    const act = mod.activate || mod.default?.activate;
    if (typeof act === 'function') await act(entry.api);
    errors.delete(id);
  } catch (e) {
    errors.set(id, e?.message || String(e));
    await onPluginError(id, e);
  }
}

export async function activatePlugin(p) {
  if (active.has(p.id)) return;
  const m = p.manifest;
  const entry = {
    plugin: p,
    loaded: false,
    module: null,
    api: null,
    skins: [],
    data: { settings: {}, storage: {} },
    settingsListeners: new Set(),
    notifySettings(key, value) {
      for (const f of entry.settingsListeners) f(key, value);
    },
  };
  active.set(p.id, entry);

  // Lo declarado en el manifiesto existe sin ejecutar ninguna línea del plugin.
  for (const s of m.contributes?.skins || []) {
    entry.skins.push(s.id);
    registerSkin({
      id: s.id,
      name: s.name,
      description: s.description || '',
      icon: s.icon || 'palette',
      css: s.css ? `plumd-plugin://${p.id}/${s.css}` : null,
      vars: s.vars,
      varsDark: s.varsDark,
      owner: p.id,
    });
  }
  for (const c of m.contributes?.commands || []) {
    registerStubCommand(
      {
        id: c.id,
        title: c.title,
        keys: c.keys,
        // Comando declarado: carga el código del plugin si hace falta y ejecuta su versión real.
        run: async (arg) => {
          await ensureLoaded(p.id);
          const real = items('commands').find((x) => x.id === c.id && !x.stub);
          if (!real) throw new Error(`El plugin no registró la lógica del comando "${c.id}".`);
          return real.run(arg);
        },
      },
      p.id,
    );
  }
  if (m.main && startsAtStartup(m)) await ensureLoaded(p.id);
  emit('plugins:changed');
}

export function deactivatePlugin(id) {
  const entry = active.get(id);
  if (!entry) return;
  try {
    entry.module?.deactivate?.();
  } catch (e) {
    console.error(`[plugin ${id}] error en deactivate()`, e);
  }
  disposeOwner(id);
  for (const sid of entry.skins) unregisterSkin(sid);
  active.delete(id);
  emit('plugins:changed');
}

// Lee la lista del proceso principal y activa los plugins habilitados.
export async function startPlugins() {
  info = await window.api.pluginsList();
  if (info.safeMode) {
    host.notify(
      info.recovered
        ? 'PluMd se cerró o se bloqueó mientras cargaba los plugins, así que ha arrancado sin ellos (modo seguro). Revisa Ayuda > Administrar plugins.'
        : 'PluMd ha arrancado en modo seguro: no se ha cargado ningún plugin.',
    );
    emit('plugins:changed');
    return;
  }
  // Si la carga bloquea la ventana, el próximo arranque lo detecta y entra en modo seguro.
  await window.api.pluginsMarkLoading(true);
  for (const p of info.plugins) {
    if (!p.error && (p.enabled || p.autoEnabled)) {
      try {
        await activatePlugin(p);
      } catch (e) {
        errors.set(p.id, e?.message || String(e));
        console.error(`[plugin ${p.id}]`, e);
      }
    }
  }
  await window.api.pluginsMarkLoading(false);
  emit('plugins:changed');
}

export async function reloadPlugins() {
  for (const id of [...active.keys()]) deactivatePlugin(id);
  errors.clear();
  nonce = Date.now();
  await startPlugins();
}

export async function refreshInfo() {
  info = await window.api.pluginsList();
  return info;
}

// Activar o desactivar desde la pantalla de plugins. Al activar por primera vez (o tras actualizar su
// versión) se muestran sus permisos declarados y el aviso de que tiene los permisos de la aplicación.
export async function setPluginEnabled(p, on) {
  if (on) {
    if (info.safeMode) {
      host.notify('Estás en modo seguro: reinicia PluMd normalmente para activar plugins.');
      return false;
    }
    if (p.consentedVersion !== p.manifest.version && !p.dev) {
      const perms = (p.manifest.permissions || []).join(', ') || 'ninguno declarado';
      const ok = await host.confirm({
        title: `Activar «${p.manifest.name}»`,
        message: `Permisos que declara el plugin: ${perms}. Un plugin activado tiene los mismos permisos que PluMd: puede leer y escribir tus ficheros. Actívalo solo si confías en quien lo ha escrito.`,
        okLabel: 'Activar',
        danger: true,
      });
      if (!ok) return false;
    }
    await window.api.pluginsSetEnabled(p.id, true, p.manifest.version);
    errors.delete(p.id);
    await refreshInfo();
    const fresh = info.plugins.find((x) => x.id === p.id);
    window.api.pluginsMarkLoading(true);
    try {
      await activatePlugin(fresh);
    } finally {
      window.api.pluginsMarkLoading(false);
    }
  } else {
    await window.api.pluginsSetEnabled(p.id, false);
    deactivatePlugin(p.id);
    await refreshInfo();
  }
  emit('plugins:changed');
  return true;
}

// Ajustes de un plugin (se leen y se guardan aunque el plugin no esté cargado).
export async function getSettings(p) {
  const schema = p.manifest.contributes?.settings || {};
  const data = active.get(p.id)?.data || { settings: {}, storage: {}, ...(await window.api.pluginsDataGet(p.id)) };
  const out = {};
  for (const [k, def] of Object.entries(schema)) out[k] = data.settings?.[k] !== undefined ? data.settings[k] : def.default;
  return out;
}

export async function saveSettings(p, values) {
  const entry = active.get(p.id);
  const data = entry?.data || { settings: {}, storage: {}, ...(await window.api.pluginsDataGet(p.id)) };
  const changed = Object.entries(values).filter(([k, v]) => data.settings?.[k] !== v);
  data.settings = { ...data.settings, ...values };
  await window.api.pluginsDataSet(p.id, data);
  if (entry) {
    entry.data = data;
    for (const [k, v] of changed) entry.notifySettings(k, v);
  }
}

export { API_VERSION };
