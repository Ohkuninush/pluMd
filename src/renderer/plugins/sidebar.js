import { items, on, reportError } from './registry.js';

// Pestañas del panel lateral: "Archivos" (el explorador) y los paneles que registran los plugins.
// Si no hay paneles de plugins, la tira de pestañas no se muestra y el panel es el de siempre.
export function initSidebarPanels() {
  const $ = (id) => document.getElementById(id);
  const tabs = $('sb-tabs');
  const files = $('sb-files');
  const holder = $('sb-panels');
  let selected = 'files';
  const mounted = new Map(); // id -> { el, inst }

  function show() {
    const panels = items('panels');
    files.hidden = selected !== 'files';
    holder.hidden = selected === 'files';
    for (const [id, m] of mounted) m.el.hidden = id !== selected;
    if (selected !== 'files') {
      if (!mounted.has(selected)) {
        const p = panels.find((x) => x.id === selected);
        if (!p) return;
        const el = document.createElement('div');
        el.className = 'sb-panel';
        holder.append(el);
        const m = { el, inst: null };
        mounted.set(selected, m);
        try {
          m.inst = p.mount(el, {}) || null;
        } catch (e) {
          el.textContent = `El plugin «${p.owner}» falló al crear este panel: ${e.message}`;
          reportError(p.owner, e);
        }
      }
      try {
        mounted.get(selected).inst?.onShow?.();
      } catch (e) {
        reportError(panels.find((x) => x.id === selected)?.owner || 'core', e);
      }
    }
  }

  function render() {
    const panels = items('panels');
    for (const [id, m] of [...mounted]) {
      if (panels.some((p) => p.id === id)) continue;
      try {
        m.inst?.destroy?.();
      } catch (e) {
        console.error(e);
      }
      m.el.remove();
      mounted.delete(id);
      if (selected === id) selected = 'files';
    }
    tabs.hidden = panels.length === 0;
    tabs.textContent = '';
    const mk = (key, label) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sb-tab' + (selected === key ? ' active' : '');
      b.textContent = label;
      b.addEventListener('click', () => {
        selected = key;
        render();
      });
      tabs.append(b);
    };
    mk('files', 'Archivos');
    panels.forEach((p) => mk(p.id, p.title));
    show();
  }

  on('panel:show', (id) => {
    if (!items('panels').some((p) => p.id === id)) return;
    selected = id;
    render();
  });
  on('registry:panels', render);
  render();
}
