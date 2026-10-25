import { icon, hydrateIcons } from './icons.js';
import { LANGS } from './highlight.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// ---- Constructores de elementos de la cinta ----
const lg = (cmd, label, ic, title, state) => ({ t: 'btn', size: 'lg', cmd, label, icon: ic, title: title || label, state });
const sm = (cmd, label, ic, title, state) => ({ t: 'btn', size: 'sm', cmd, label, icon: ic, title: title || label, state });
const ib = (cmd, ic, title, state, cls) => ({ t: 'btn', size: 'ic', cmd, icon: ic, title, state, cls });
const hb = (cmd, html, title, state, cls) => ({ t: 'btn', size: 'ic', cmd, html, title, state, cls });
const stack = (...rows) => ({ t: 'stack', rows });
const grp = (label, ...items) => ({ label, items });

const STYLES = [
  ['normal', 'Normal'], ['h1', 'Título 1'], ['h2', 'Título 2'], ['h3', 'Título 3'],
  ['h4', 'Título 4'], ['h5', 'Título 5'], ['h6', 'Título 6'], ['quote', 'Cita'],
];

const TABS = [
  {
    id: 'home',
    groups: [
      grp('Portapapeles', lg('paste', 'Pegar', 'paste', 'Pegar (Ctrl+V)'), stack([sm('cut', 'Cortar', 'cut', 'Cortar (Ctrl+X)')], [sm('copy', 'Copiar', 'copy', 'Copiar (Ctrl+C)')])),
      grp(
        'Fuente',
        stack(
          [ib('bold', 'bold', 'Negrita (Ctrl+B)', 'bold'), ib('italic', 'italic', 'Cursiva (Ctrl+I)', 'italic'), ib('underline', 'underline', 'Subrayado (Ctrl+U)', 'underline'), ib('strike', 'strike', 'Tachado', 'strike')],
          [hb('sub', 'x<sub>2</sub>', 'Subíndice', 'sub'), hb('sup', 'x<sup>2</sup>', 'Superíndice', 'sup'), ib('code', 'code', 'Código en línea', 'code'), ib('clear', 'eraser', 'Borrar formato')],
        ),
      ),
      grp(
        'Párrafo',
        stack(
          [ib('ul', 'ul', 'Viñetas', 'ul'), ib('ol', 'ol', 'Numeración', 'ol'), ib('task', 'task', 'Lista de tareas', 'task'), ib('outdent', 'outdent', 'Disminuir sangría (Mayús+Tab)'), ib('indent', 'indent', 'Aumentar sangría (Tab)')],
          [ib('style-quote', 'quote', 'Cita', 'style-quote'), ib('rule', 'hr', 'Línea horizontal')],
        ),
      ),
      { label: 'Estilos', items: [{ t: 'gallery' }] },
      grp('Edición', stack([sm('find', 'Buscar', 'search', 'Buscar (Ctrl+F)')], [sm('replace', 'Reemplazar', 'replace', 'Reemplazar (Ctrl+H)')], [sm('selectall', 'Seleccionar todo', 'selectall', 'Seleccionar todo (Ctrl+A)')])),
    ],
  },
  {
    id: 'insert',
    groups: [
      grp('Tablas', lg('table', 'Tabla', 'table', 'Insertar tabla')),
      grp('Ilustraciones', lg('image', 'Imagen', 'image', 'Insertar imagen')),
      grp('Vínculos', lg('link', 'Vínculo', 'link', 'Insertar vínculo (Ctrl+K)')),
      grp('Código', lg('codeblock', 'Bloque de código', 'codeblock', 'Insertar bloque de código'), { t: 'select' }),
      grp('Elementos', lg('rule', 'Línea horizontal', 'hr'), lg('task', 'Lista de tareas', 'task', 'Lista de tareas', 'task'), lg('comment', 'Comentario', 'comment', 'Comentario oculto <!-- -->'), lg('props', 'Propiedades', 'props', 'Propiedades del documento (YAML)')),
    ],
  },
  {
    id: 'view',
    groups: [
      grp('Vistas', lg('mode-read', 'Lectura', 'eye', 'Documento limpio, editable (Ctrl+E)', 'mode-read'), lg('mode-source', 'Código', 'filecode', 'Markdown sin renderizar (Ctrl+E)', 'mode-source')),
      grp('Zoom', lg('zoom-in', 'Acercar', 'zoomin'), lg('zoom-out', 'Alejar', 'zoomout'), lg('zoom-reset', '100%', 'search', 'Zoom al 100%')),
      grp('Tema', lg('theme-light', 'Claro', 'sun', 'Tema claro', 'theme-light'), lg('theme-dark', 'Oscuro', 'moon', 'Tema oscuro', 'theme-dark')),
    ],
  },
];

function btnHtml(i) {
  const size = i.size === 'lg' ? 28 : 16;
  const label = i.label && i.size !== 'ic' ? `<span class="rb-label">${esc(i.label)}</span>` : '';
  const dd = i.cmd === 'table' ? icon('chevron', 10) : '';
  return `<button type="button" class="rb rb-${i.size} ${i.cls || ''}" data-cmd="${i.cmd}"${i.state ? ` data-state="${i.state}"` : ''} title="${esc(i.title || i.label || '')}">${i.icon ? icon(i.icon, size) : ''}${i.html ? `<span>${i.html}</span>` : ''}${label}${dd}</button>`;
}

function itemHtml(it) {
  if (it.t === 'btn') return btnHtml(it);
  if (it.t === 'stack') return `<div class="stack">${it.rows.map((r) => `<div class="stack-row">${r.map(itemHtml).join('')}</div>`).join('')}</div>`;
  if (it.t === 'gallery') {
    return `<div class="gallery">${STYLES.map(([k, l]) => `<button type="button" class="st st-${k}" data-cmd="style-${k}" data-state="style-${k}" title="${l}"><span>${l}</span></button>`).join('')}</div>`;
  }
  if (it.t === 'select') {
    return `<div class="stack"><div class="stack-row"><label class="sel-label">Lenguaje</label></div><div class="stack-row"><select data-cmd="codelang" title="Lenguaje del bloque de código"><option value="">(ninguno)</option>${LANGS.map(([n, a]) => `<option value="${a[0]}">${esc(n)}</option>`).join('')}</select></div></div>`;
  }
  return '';
}

const groupHtml = (g) => `<div class="grp"><div class="grp-body">${g.items.map(itemHtml).join('')}</div><div class="grp-label">${g.label}</div></div>`;

export function createRibbon({ run }) {
  const panels = document.getElementById('panels');
  panels.innerHTML = TABS.map((t) => `<div class="panel" id="panel-${t.id}" ${t.id === 'home' ? '' : 'hidden'}>${t.groups.map(groupHtml).join('')}</div>`).join('');
  hydrateIcons(document);

  let current = {};
  let collapsed = false;

  // ---- Pestañas ----
  const tabs = [...document.querySelectorAll('#tabs [data-tab]')];
  function showTab(id) {
    tabs.forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
    TABS.forEach((t) => (document.getElementById(`panel-${t.id}`).hidden = t.id !== id));
    setCollapsed(false);
  }
  function setCollapsed(v) {
    collapsed = v;
    panels.classList.toggle('collapsed', v);
    const b = document.getElementById('btn-collapse');
    if (b) b.title = v ? 'Expandir la cinta' : 'Contraer la cinta';
    document.body.classList.toggle('ribbon-collapsed', v);
  }
  tabs.forEach((b) => {
    b.addEventListener('click', () => showTab(b.dataset.tab));
    b.addEventListener('dblclick', () => setCollapsed(!collapsed));
  });

  // ---- Popups: menú Archivo y selector de tabla ----
  const fileMenu = document.createElement('div');
  fileMenu.className = 'popup menu';
  fileMenu.hidden = true;
  fileMenu.innerHTML = [
    ['new', 'Nuevo', 'filecode'], ['open', 'Abrir…   Ctrl+O', 'open'], ['save', 'Guardar   Ctrl+S', 'save'], ['saveas', 'Guardar como…', 'saveas'],
  ].map(([c, l, i]) => `<button type="button" data-cmd="${c}">${icon(i, 16)}<span>${l}</span></button>`).join('');
  document.body.append(fileMenu);

  const picker = document.createElement('div');
  picker.className = 'popup tpicker';
  picker.hidden = true;
  const N = 8;
  picker.innerHTML = `<div class="tp-label">Insertar tabla</div><div class="tp-grid">${Array.from({ length: N * N }, (_, i) => `<div class="tp-cell" data-r="${Math.floor(i / N) + 1}" data-c="${(i % N) + 1}"></div>`).join('')}</div>`;
  document.body.append(picker);
  const tpLabel = picker.querySelector('.tp-label');

  const closePopups = () => { fileMenu.hidden = true; picker.hidden = true; };
  const place = (pop, anchor) => {
    const r = anchor.getBoundingClientRect();
    pop.style.left = `${Math.min(r.left, window.innerWidth - 220)}px`;
    pop.style.top = `${r.bottom + 2}px`;
    pop.hidden = false;
  };

  picker.addEventListener('mouseover', (e) => {
    const c = e.target.closest('.tp-cell');
    if (!c) return;
    const r = +c.dataset.r;
    const cc = +c.dataset.c;
    picker.querySelectorAll('.tp-cell').forEach((x) => x.classList.toggle('on', +x.dataset.r <= r && +x.dataset.c <= cc));
    tpLabel.textContent = `${cc} × ${r} (columnas × filas)`;
  });
  picker.addEventListener('mousedown', (e) => e.preventDefault());
  picker.addEventListener('click', (e) => {
    const c = e.target.closest('.tp-cell');
    if (!c) return;
    closePopups();
    run('table', { rows: +c.dataset.r, cols: +c.dataset.c });
  });

  // ---- Clics sobre cualquier botón con data-cmd ----
  document.addEventListener('mousedown', (e) => {
    // Evita que el botón robe el foco (y con él la selección del editor).
    if (e.target.closest('button[data-cmd], .tp-cell')) e.preventDefault();
    if (!e.target.closest('.popup') && !e.target.closest('[data-cmd="file-menu"], [data-cmd="table"]')) closePopups();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopups(); });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cmd]');
    if (!b || b.tagName === 'SELECT') return;
    const cmd = b.dataset.cmd;
    if (cmd === 'table') {
      const open = !picker.hidden;
      closePopups();
      if (!open) place(picker, b);
      return;
    }
    if (cmd === 'file-menu') {
      const open = !fileMenu.hidden;
      closePopups();
      if (!open) place(fileMenu, b);
      return;
    }
    if (cmd === 'ribbon-toggle') return setCollapsed(!collapsed);
    closePopups();
    run(cmd, b);
  });

  function apply() {
    document.querySelectorAll('[data-state]').forEach((b) => b.classList.toggle('active', !!current[b.dataset.state]));
  }

  return {
    showTab,
    // f: resultado de formatState(); extra: estados adicionales (modo, tema…)
    update(f) {
      const next = { ...current };
      for (const k of Object.keys(next)) if (k.startsWith('style-')) delete next[k];
      Object.assign(next, {
        bold: f.bold, italic: f.italic, underline: f.underline, strike: f.strike, sub: f.sub, sup: f.sup, code: f.code,
        ul: f.list === 'ul', ol: f.list === 'ol', task: f.list === 'task', [`style-${f.style}`]: true,
      });
      current = next;
      apply();
    },
    setActive(map) {
      current = { ...current, ...map };
      apply();
    },
    codeLang: () => document.querySelector('select[data-cmd="codelang"]')?.value || '',
  };
}
