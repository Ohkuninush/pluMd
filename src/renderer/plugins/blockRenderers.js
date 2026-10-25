import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { getBlockRenderer, reportError } from './registry.js';

// Bloques de código ``` cuyo lenguaje tiene un renderizador registrado (por un plugin): en modo Lectura se
// dibujan como contenido propio. Si el cursor entra en el bloque, se ve el código para poder editarlo.

export const refreshBlocks = StateEffect.define();

const themeKey = () => `${document.documentElement.dataset.skin}|${document.documentElement.dataset.theme}`;

// Información de un bloque: lenguaje, y rango del contenido entre las vallas.
export function blockInfo(state, node) {
  const info = node.node.getChild('CodeInfo');
  const lang = info ? state.sliceDoc(info.from, info.to).trim().split(/\s+/)[0].toLowerCase() : '';
  const closed = node.node.getChildren('CodeMark').length >= 2;
  const first = state.doc.lineAt(node.from);
  const last = state.doc.lineAt(node.to);
  const contentFrom = Math.min(first.to + 1, node.to);
  const contentTo = closed ? Math.max(contentFrom, last.from - 1) : node.to;
  return { lang, contentFrom, contentTo, closed };
}

// ¿Este bloque se dibuja con un renderizador (y por tanto no hay que decorar su código)?
export function isRenderedBlock(state, node) {
  const { lang } = blockInfo(state, node);
  if (!lang || !getBlockRenderer(lang)) return false;
  return !state.selection.ranges.some((r) => r.from <= node.to && r.to >= node.from);
}

function blockNodeAt(view, dom) {
  let pos;
  try {
    pos = view.posAtDOM(dom);
  } catch {
    return null;
  }
  let n = syntaxTree(view.state).resolveInner(pos, 1);
  while (n && n.name !== 'FencedCode') n = n.parent;
  return n;
}

class BlockWidget extends WidgetType {
  constructor(lang, source, key) {
    super();
    this.lang = lang;
    this.source = source;
    this.key = key;
  }

  eq(o) {
    return o.lang === this.lang && o.source === this.source && o.key === this.key;
  }

  toDOM(view) {
    const wrap = document.createElement('div');
    wrap.className = 'cm-block-widget';
    wrap.dataset.lang = this.lang;
    const head = document.createElement('div');
    head.className = 'cm-block-head';
    const label = document.createElement('span');
    label.textContent = this.lang;
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Editar código';
    edit.title = 'Ver y editar el código de este bloque';
    edit.addEventListener('mousedown', (e) => e.preventDefault());
    edit.addEventListener('click', () => {
      const n = blockNodeAt(view, wrap);
      if (n) view.dispatch({ selection: { anchor: Math.min(n.from + 3, n.to) }, scrollIntoView: true });
      view.focus();
    });
    head.append(label, edit);
    const body = document.createElement('div');
    body.className = 'cm-block-body';
    wrap.append(head, body);
    wrap._view = view;
    wrap._lang = this.lang;
    this.mount(wrap, body);
    return wrap;
  }

  mount(wrap, body) {
    const r = getBlockRenderer(this.lang);
    body.textContent = '';
    wrap._source = this.source;
    wrap._key = this.key;
    if (!r) return;
    const view = wrap._view;
    const ctx = {
      language: this.lang,
      get theme() { return document.documentElement.dataset.theme; },
      get skin() { return document.documentElement.dataset.skin; },
      editable: true,
      // Sustituye el contenido del bloque (entre las vallas) por texto nuevo.
      replaceSource(text) {
        const n = blockNodeAt(view, wrap);
        if (!n) return;
        const { contentFrom, contentTo } = blockInfo(view.state, n);
        view.dispatch({ changes: { from: contentFrom, to: Math.max(contentFrom, contentTo), insert: String(text) }, userEvent: 'input.block' });
      },
    };
    try {
      wrap._inst = r.render(body, this.source, ctx) || null;
    } catch (e) {
      wrap._inst = null;
      body.textContent = `El plugin «${r.owner}» falló al dibujar este bloque: ${e.message}`;
      body.classList.add('cm-block-error');
      reportError(r.owner, e);
    }
  }

  updateDOM(dom) {
    if (dom._lang !== this.lang) return false;
    const r = getBlockRenderer(this.lang);
    const body = dom.querySelector('.cm-block-body');
    if (r && dom._inst && typeof dom._inst.update === 'function') {
      try {
        dom._inst.update(this.source);
        dom._source = this.source;
        dom._key = this.key;
        return true;
      } catch (e) {
        reportError(r.owner, e);
      }
    }
    dom._inst?.destroy?.();
    body.classList.remove('cm-block-error');
    this.mount(dom, body);
    return true;
  }

  destroy(dom) {
    try {
      dom._inst?.destroy?.();
    } catch (e) {
      reportError('core', e);
    }
  }

  ignoreEvent() {
    return true;
  }
}

function build(state) {
  const out = [];
  const key = themeKey();
  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== 'FencedCode') return;
      const { lang, contentFrom, contentTo } = blockInfo(state, node);
      if (!lang || !getBlockRenderer(lang)) return false;
      if (state.selection.ranges.some((r) => r.from <= node.to && r.to >= node.from)) return false;
      out.push(Decoration.replace({ widget: new BlockWidget(lang, state.sliceDoc(contentFrom, contentTo), key), block: true }).range(node.from, node.to));
      return false;
    },
  });
  return Decoration.set(out);
}

export const blockField = StateField.define({
  create: build,
  update(value, tr) {
    const changed = tr.docChanged || tr.selection || tr.effects.some((e) => e.is(refreshBlocks)) || syntaxTree(tr.state) !== syntaxTree(tr.startState);
    return changed ? build(tr.state) : value;
  },
  provide: (f) => EditorView.decorations.from(f),
});
