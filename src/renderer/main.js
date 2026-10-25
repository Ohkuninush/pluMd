import { EditorState, Compartment, Prec } from '@codemirror/state';
import { EditorView, keymap, drawSelection, lineNumbers, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, undo, redo, selectAll } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { searchKeymap, openSearchPanel } from '@codemirror/search';
import { livePreview, skipHiddenForward } from './livePreview.js';
import { tableField } from './tables.js';
import { codeLanguages, codeHighlight } from './highlight.js';
import { setBaseDir, dirname } from './images.js';
import {
  toggleWrap, setParagraphStyle, toggleList, toggleTaskList, changeIndent, insertRule, insertCodeBlock, exitCodeBlock,
  insertComment, insertFrontmatter, clearFormat, paragraphEnter, softBreak, exitEmptyListItem, clipCopy, clipPaste, formatState,
  insertTable, insertLink, insertImage, linkAt, normalizeUrl,
} from './commands.js';
import { askLink, askImage } from './dialogs.js';
import { createRibbon } from './ribbon.js';

const $ = (id) => document.getElementById(id);

const state = { file: null, mtimeMs: null, dirty: false, mode: 'read', loading: false, zoom: 100 };
const modeCompartment = new Compartment();
let ribbon = null;

// Lectura: documento limpio (marcas ocultas), editable como en un procesador de textos.
// Código: el Markdown tal cual.
const modeExtensions = (mode) =>
  mode === 'read' ? [livePreview({ reveal: false }), tableField] : [lineNumbers()];

// Ctrl+clic sobre un enlace lo abre en el navegador.
const linkClicks = EditorView.domEventHandlers({
  click(e, v) {
    if (!(e.ctrlKey || e.metaKey)) return false;
    const pos = v.posAtCoords({ x: e.clientX, y: e.clientY });
    const l = pos == null ? null : linkAt(v.state, pos);
    if (!l) return false;
    window.api.openExternal(normalizeUrl(l.url));
    return true;
  },
});

function endKey(v, extend) {
  const sel = v.state.selection.main;
  const pos = skipHiddenForward(v, v.moveToLineBoundary(sel, true).head);
  v.dispatch({ selection: extend ? { anchor: sel.anchor, head: pos } : { anchor: pos }, scrollIntoView: true });
  return true;
}

const askImageHere =(d) => askImage(d, () => state.file);

let countTimer = null;
function updateCount(s) {
  clearTimeout(countTimer);
  countTimer = setTimeout(() => {
    const n = (s.doc.toString().match(/\S+/g) || []).length;
    $('wordcount').textContent = `${n} ${n === 1 ? 'palabra' : 'palabras'}`;
  }, 200);
}

const view = new EditorView({
  parent: $('editor'),
  state: EditorState.create({
    doc: '',
    extensions: [
      history(),
      drawSelection(),
      EditorView.lineWrapping,
      placeholder('Escribe aquí o abre un fichero .md (Ctrl+O)'),
      markdown({ base: markdownLanguage, codeLanguages }),
      codeHighlight,
      // Con las marcas de formato ocultas, Fin e Intro dejan el cursor fuera del formato: así un Intro
      // al final de un texto en negrita no parte la negrita entre dos párrafos.
      Prec.highest(keymap.of([
        {
          key: 'Enter',
          run: (v) => {
            if (exitEmptyListItem(v)) return true;
            const s = v.state.selection.main;
            if (s.empty) {
              const p = skipHiddenForward(v, s.head);
              if (p !== s.head) v.dispatch({ selection: { anchor: p } });
            }
            if (state.mode === 'read' && paragraphEnter(v)) return true;
            return false; // sigue el Intro normal (continuar lista, etc.)
          },
        },
        { key: 'Shift-Enter', run: (v) => state.mode === 'read' && softBreak(v) },
        { key: 'End', run: (v) => endKey(v, false), shift: (v) => endKey(v, true) },
      ])),
      keymap.of([
        { key: 'Mod-b', run: (v) => (toggleWrap(v, '**'), true) },
        { key: 'Mod-i', run: (v) => (toggleWrap(v, '*'), true) },
        { key: 'Mod-u', run: (v) => (toggleWrap(v, '<u>', '</u>'), true) },
        { key: 'Mod-k', run: (v) => (insertLink(v, askLink), true) },
        { key: 'Mod-h', run: (v) => (openSearchPanel(v), true) },
        // Tab sangra los elementos de lista; en texto normal no hace nada (Markdown no tiene sangría de párrafo).
        { key: 'Tab', run: (v) => changeIndent(v, 1) || true },
        { key: 'Shift-Tab', run: (v) => changeIndent(v, -1) || true },
        { key: 'Mod-Enter', run: (v) => exitCodeBlock(v) },
        { key: 'ArrowDown', run: (v) => exitCodeBlock(v, true) },
        ...defaultKeymap, ...historyKeymap, ...searchKeymap,
      ]),
      linkClicks,
      modeCompartment.of(modeExtensions('read')),
      EditorView.updateListener.of((u) => {
        if (u.docChanged && !state.loading) setDirty(true);
        if (u.docChanged) updateCount(u.state);
        if ((u.docChanged || u.selectionSet) && ribbon) ribbon.update(formatState(u.state));
      }),
    ],
  }),
});

function setDirty(v) {
  state.dirty = v;
  $('dirty').hidden = !v;
  updateTitle();
}

function updateTitle() {
  const name = state.file ? state.file.split(/[\\/]/).pop() : 'Documento sin título';
  $('filename').textContent = name;
  window.api.setTitle(`${state.dirty ? '● ' : ''}${name} — Visor MD`);
}

function showBanner(text, actions = []) {
  const b = $('banner');
  b.innerHTML = '';
  b.append(text + ' ');
  for (const [label, fn] of actions) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.onclick = () => { b.hidden = true; fn(); };
    b.append(btn);
  }
  b.hidden = false;
}

function setMode(mode) {
  state.mode = mode;
  view.dispatch({ effects: modeCompartment.reconfigure(modeExtensions(mode)) });
  $('editor').classList.toggle('source', mode === 'source');
  ribbon.setActive({ 'mode-read': mode === 'read', 'mode-source': mode === 'source' });
  view.focus();
}

function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  ribbon.setActive({ 'theme-light': t === 'light', 'theme-dark': t === 'dark' });
}
function chooseTheme(t) {
  applyTheme(t);
  try { localStorage.setItem('theme', t); } catch {}
}

function setZoom(z) {
  state.zoom = Math.max(50, Math.min(250, Math.round(z)));
  $('editor').style.setProperty('--zoom', state.zoom / 100);
  $('zoom').value = state.zoom;
  $('zoomval').textContent = `${state.zoom}%`;
}

async function confirmDiscard() {
  return !state.dirty || confirm('Hay cambios sin guardar. ¿Descartarlos?');
}

function loadContent(path, content, mtimeMs) {
  // La carpeta base se fija antes de cargar para que las imágenes relativas se resuelvan bien.
  setBaseDir(path ? dirname(path) : null);
  state.loading = true;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: content }, selection: { anchor: 0 } });
  state.loading = false;
  Object.assign(state, { file: path, mtimeMs });
  $('banner').hidden = true;
  setDirty(false);
  updateCount(view.state);
}

async function openFile(path) {
  if (!path || !(await confirmDiscard())) return;
  try {
    const f = await window.api.readFile(path);
    loadContent(f.path, f.content, f.mtimeMs);
    view.focus();
  } catch (e) {
    showBanner(`No se pudo abrir el fichero: ${e.message}`);
  }
}

async function newDoc() {
  if (!(await confirmDiscard())) return;
  loadContent(null, '', null);
  view.focus();
}

async function save(force = false) {
  if (!state.file) return saveAs();
  const r = await window.api.writeFile({
    path: state.file,
    content: view.state.doc.toString(),
    expectedMtimeMs: state.mtimeMs,
    force,
  });
  if (r.conflict) {
    showBanner('El fichero ha cambiado en disco desde que lo abriste.', [
      ['Sobrescribir', () => save(true)],
      ['Cancelar', () => {}],
    ]);
    return;
  }
  state.mtimeMs = r.mtimeMs;
  setDirty(false);
}

async function saveAs() {
  const suggested = state.file || 'sin-titulo.md';
  const p = await window.api.saveAsDialog(suggested);
  if (!p) return;
  const r = await window.api.writeFile({ path: p, content: view.state.doc.toString(), expectedMtimeMs: null, force: true });
  state.file = p;
  state.mtimeMs = r.mtimeMs;
  setBaseDir(dirname(p));
  setDirty(false);
}

// ---- Comandos de la cinta ----
const commands = {
  // Archivo
  new: () => newDoc(),
  open: async () => openFile(await window.api.openDialog()),
  save: () => save(),
  saveas: () => saveAs(),
  // Portapapeles y edición
  undo: (v) => (undo(v), v.focus()),
  redo: (v) => (redo(v), v.focus()),
  paste: (v) => clipPaste(v),
  cut: (v) => clipCopy(v, true),
  copy: (v) => clipCopy(v, false),
  find: (v) => openSearchPanel(v),
  replace: (v) => openSearchPanel(v),
  selectall: (v) => (selectAll(v), v.focus()),
  // Fuente
  bold: (v) => toggleWrap(v, '**'),
  italic: (v) => toggleWrap(v, '*'),
  underline: (v) => toggleWrap(v, '<u>', '</u>'),
  strike: (v) => toggleWrap(v, '~~'),
  sub: (v) => toggleWrap(v, '<sub>', '</sub>'),
  sup: (v) => toggleWrap(v, '<sup>', '</sup>'),
  code: (v) => toggleWrap(v, '`'),
  clear: (v) => clearFormat(v),
  // Párrafo
  ul: (v) => toggleList(v, 'ul'),
  ol: (v) => toggleList(v, 'ol'),
  task: (v) => toggleTaskList(v),
  outdent: (v) => changeIndent(v, -1),
  indent: (v) => changeIndent(v, 1),
  rule: (v) => insertRule(v),
  // Insertar
  link: (v) => insertLink(v, askLink),
  image: (v) => insertImage(v, askImageHere),
  table: (v, a) => insertTable(v, a?.rows || 3, a?.cols || 3),
  codeblock: (v) => insertCodeBlock(v, ribbon.codeLang()),
  comment: (v) => insertComment(v),
  props: (v) => insertFrontmatter(v),
  // Vista
  'mode-read': () => setMode('read'),
  'mode-source': () => setMode('source'),
  'zoom-in': () => setZoom(state.zoom + 10),
  'zoom-out': () => setZoom(state.zoom - 10),
  'zoom-reset': () => setZoom(100),
  'theme-light': () => chooseTheme('light'),
  'theme-dark': () => chooseTheme('dark'),
};
for (const n of [1, 2, 3, 4, 5, 6]) commands[`style-h${n}`] = (v) => setParagraphStyle(v, `h${n}`);
commands['style-normal'] = (v) => setParagraphStyle(v, 'normal');
commands['style-quote'] = (v) => setParagraphStyle(v, 'quote');

ribbon = createRibbon({ run: (cmd, arg) => commands[cmd]?.(view, arg) });
ribbon.update(formatState(view.state));

// Tema: por defecto el del sistema; la elección manual se recuerda.
let savedTheme = null;
try { savedTheme = localStorage.getItem('theme'); } catch {}
applyTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
setMode('read');
setZoom(100);

$('zoom').addEventListener('input', (e) => setZoom(+e.target.value));
window.addEventListener('wheel', (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  setZoom(state.zoom + (e.deltaY < 0 ? 10 : -10));
}, { passive: false });

window.api.onOpenFile(openFile);

window.addEventListener('keydown', async (e) => {
  if (!e.ctrlKey) return;
  const k = e.key.toLowerCase();
  if (k === 's') { e.preventDefault(); e.shiftKey ? saveAs() : save(); }
  else if (k === 'o') { e.preventDefault(); commands.open(); }
  else if (k === 'n') { e.preventDefault(); newDoc(); }
  else if (k === 'e') { e.preventDefault(); setMode(state.mode === 'read' ? 'source' : 'read'); }
  else if (k === '=' || k === '+') { e.preventDefault(); setZoom(state.zoom + 10); }
  else if (k === '-') { e.preventDefault(); setZoom(state.zoom - 10); }
  else if (k === '0') { e.preventDefault(); setZoom(100); }
});

updateTitle();
