import { openBox, el, closeBox } from '../dialogs.js';
import { items, executeCommand } from './registry.js';
import {
  getInfo, refreshInfo, isActive, lastError, setPluginEnabled, reloadPlugins, getSettings, saveSettings,
} from './loader.js';

// ---- Pantalla de plugins ----

const chip = (text, cls) => el('span', `chip ${cls || ''}`, text);

function statusOf(p) {
  if (p.error) return { text: 'Inválido', cls: 'bad', detail: p.error };
  const err = lastError(p.id);
  if (err) return { text: 'Con error', cls: 'bad', detail: err };
  if (isActive(p.id)) return { text: 'Activo', cls: 'ok' };
  if (p.failures >= getInfo().maxFailures) return { text: 'Desactivado por fallos', cls: 'bad', detail: `Falló ${p.failures} veces seguidas. Actívalo de nuevo si quieres reintentarlo.` };
  return { text: 'Desactivado', cls: '' };
}

export async function openPluginsDialog(host) {
  await refreshInfo();
  const { host: dlg, box } = openBox('dlg-plugins');
  const render = async () => {
    const info = await refreshInfo();
    box.textContent = '';
    box.append(el('h3', null, 'Plugins'));
    box.append(
      el('p', 'dlg-hint', 'Los plugins amplían PluMd con funciones nuevas: aspectos, botones, paneles, bloques... Un plugin activado tiene los mismos permisos que PluMd, así que actívalos solo si confías en quien los ha escrito.'),
    );
    if (info.safeMode) {
      box.append(
        el('div', 'plugin-alert', info.recovered
          ? 'Modo seguro: PluMd se cerró o se bloqueó la última vez que cargó los plugins. No se carga ninguno. Reinicia PluMd para volver a intentarlo.'
          : 'Modo seguro: no se carga ningún plugin. Reinicia PluMd normalmente para activarlos.'),
      );
    }

    const list = el('div', 'plugin-list');
    if (!info.plugins.length) {
      const empty = el('div', 'plugin-empty');
      empty.append(
        el('p', null, 'Todavía no hay ningún plugin instalado.'),
        el('p', null, 'Para instalar uno, pulsa «Instalar desde carpeta» y elige la carpeta del plugin, o copia esa carpeta a la carpeta de plugins con «Abrir carpeta de plugins». Después pulsa «Recargar».'),
      );
      list.append(empty);
    }
    for (const p of info.plugins) {
      const m = p.manifest || {};
      const st = statusOf(p);
      const row = el('div', 'plugin-row');
      const main = el('div', 'plugin-main');
      const title = el('div', 'plugin-title');
      title.append(el('strong', null, m.name || p.id), el('span', 'plugin-ver', m.version ? `v${m.version}` : ''), chip(st.text, st.cls));
      if (p.dev) title.append(chip('desarrollo', 'dev'));
      main.append(title);
      if (m.description) main.append(el('div', 'plugin-desc', m.description));
      const meta = [m.author, `id: ${p.id}`, (m.permissions || []).length ? `permisos: ${m.permissions.join(', ')}` : ''].filter(Boolean).join('  ·  ');
      main.append(el('div', 'plugin-meta', meta));
      if (st.detail) main.append(el('div', 'plugin-error', st.detail));
      row.append(main);

      const actions = el('div', 'plugin-actions');
      if (!p.error) {
        const on = isActive(p.id);
        const toggle = el('button', on ? '' : 'primary', on ? 'Desactivar' : 'Activar');
        toggle.type = 'button';
        toggle.disabled = info.safeMode && !on;
        toggle.addEventListener('click', async () => {
          toggle.disabled = true;
          await setPluginEnabled(p, !on);
          render();
        });
        actions.append(toggle);
        if (Object.keys(m.contributes?.settings || {}).length) {
          const sb = el('button', null, 'Ajustes');
          sb.type = 'button';
          sb.addEventListener('click', () => openPluginSettings(p));
          actions.append(sb);
        }
      }
      row.append(actions);
      list.append(row);
    }
    box.append(list);

    const actions = el('div', 'dlg-actions');
    const mk = (label, fn, cls) => {
      const b = el('button', cls || null, label);
      b.type = 'button';
      b.addEventListener('click', fn);
      return b;
    };
    actions.append(
      mk('Abrir carpeta de plugins', () => window.api.pluginsOpenFolder()),
      mk('Instalar desde carpeta…', async () => {
        const r = await window.api.pluginsInstall();
        if (r.canceled) return;
        host.notify(r.ok ? `Plugin «${r.id}» instalado. Actívalo en la lista.` : `No se pudo instalar: ${r.error}`);
        render();
      }),
      mk('Recargar', async () => {
        await reloadPlugins();
        render();
      }),
    );
    actions.append(el('span', 'spacer'));
    const close = mk('Cerrar', () => {}, 'primary');
    close.dataset.close = '1';
    actions.append(close);
    box.append(actions);
    box.querySelector('[data-close]').focus();
  };
  await render();
  // closable() engancha su botón "Cerrar" una sola vez; como render() reconstruye el cuadro, se cierra a mano.
  return new Promise((resolve) => {
    const done = () => {
      closeBox(dlg);
      dlg.removeEventListener('keydown', onKey);
      dlg.removeEventListener('mousedown', onOut);
      box.removeEventListener('click', onClose);
      resolve();
    };
    const onKey = (e) => { if (e.key === 'Escape' && box.isConnected) done(); };
    const onOut = (e) => { if (e.target === dlg && box.isConnected) done(); };
    const onClose = (e) => { if (e.target.closest('[data-close]')) done(); };
    dlg.addEventListener('keydown', onKey);
    dlg.addEventListener('mousedown', onOut);
    box.addEventListener('click', onClose);
  });
}

// ---- Ajustes de un plugin ----

export async function openPluginSettings(p) {
  const schema = p.manifest.contributes?.settings || {};
  const values = await getSettings(p);
  const { host, box } = openBox('dlg-settings');
  box.append(el('h3', null, `Ajustes de «${p.manifest.name}»`));
  const inputs = {};
  for (const [key, def] of Object.entries(schema)) {
    const label = el('label', 'set-row');
    label.append(el('span', 'set-label', def.label || key));
    let input;
    if (def.type === 'boolean') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!values[key];
    } else if (def.type === 'choice') {
      input = document.createElement('select');
      for (const o of def.options || []) {
        const opt = document.createElement('option');
        opt.value = typeof o === 'object' ? o.value : o;
        opt.textContent = typeof o === 'object' ? o.label || o.value : o;
        input.append(opt);
      }
      input.value = values[key];
    } else {
      input = document.createElement('input');
      input.type = def.type === 'number' ? 'number' : 'text';
      input.value = values[key] ?? '';
    }
    inputs[key] = { input, def };
    label.append(input);
    if (def.description) label.append(el('span', 'set-desc', def.description));
    box.append(label);
  }
  const actions = el('div', 'dlg-actions');
  const cancel = el('button', null, 'Cancelar');
  cancel.type = 'button';
  const save = el('button', 'primary', 'Guardar');
  save.type = 'button';
  actions.append(el('span', 'spacer'), cancel, save);
  box.append(actions);
  return new Promise((resolve) => {
    const done = () => {
      closeBox(host);
      resolve();
    };
    cancel.addEventListener('click', done);
    save.addEventListener('click', async () => {
      const out = {};
      for (const [k, { input, def }] of Object.entries(inputs)) {
        out[k] = def.type === 'boolean' ? input.checked : def.type === 'number' ? Number(input.value) : input.value;
      }
      await saveSettings(p, out);
      done();
    });
    const onKey = (e) => { if (e.key === 'Escape' && box.isConnected) { host.removeEventListener('keydown', onKey); done(); } };
    host.addEventListener('keydown', onKey);
  });
}

// ---- Paleta de comandos (Ctrl+Mayús+P) ----

// entries: [{ id, title }] del núcleo; se completan con los comandos con título de los plugins.
export function openPalette(coreEntries) {
  const { host, box } = openBox('dlg-palette');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'pal-input';
  input.placeholder = 'Escribe el nombre de un comando…';
  input.autocomplete = 'off';
  const list = el('div', 'pal-list');
  box.append(input, list);

  const all = () => {
    const seen = new Set();
    const out = [];
    for (const c of coreEntries) if (c.title && !seen.has(c.id)) { seen.add(c.id); out.push({ ...c, plugin: null }); }
    for (const c of items('commands')) if (c.title && !seen.has(c.id)) { seen.add(c.id); out.push({ id: c.id, title: c.title, keys: c.keys, plugin: c.owner === 'core' ? null : c.owner }); }
    return out;
  };
  const entries = all();
  let shown = [];
  let sel = 0;
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    shown = entries.filter((e) => !q || e.title.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)).slice(0, 60);
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    list.textContent = '';
    shown.forEach((e, i) => {
      const row = el('div', `pal-row${i === sel ? ' sel' : ''}`);
      row.append(el('span', 'pal-title', e.title));
      if (e.plugin) row.append(el('span', 'pal-tag', e.plugin));
      if (e.keys) row.append(el('kbd', null, e.keys));
      row.addEventListener('mousedown', (ev) => { ev.preventDefault(); run(e); });
      list.append(row);
    });
    if (!shown.length) list.append(el('div', 'pal-empty', 'Ningún comando coincide.'));
    list.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  };
  let finish;
  const close = () => {
    closeBox(host);
    finish();
  };
  const run = async (e) => {
    close();
    try {
      await executeCommand(e.id);
    } catch (err) {
      console.error(err);
    }
  };
  input.addEventListener('input', () => { sel = 0; draw(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[sel]) run(shown[sel]); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  host.addEventListener('mousedown', (e) => { if (e.target === host) close(); }, { once: true });
  draw();
  input.focus();
  return new Promise((r) => { finish = r; });
}

