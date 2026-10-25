import { StateField } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

// ---- Modelo de tabla <-> texto Markdown ----

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '|') { cur += '|'; i++; }
    else if (c === '|') { cells.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

function parseTable(text) {
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  const header = splitRow(lines[0]);
  const delim = lines[1] ? splitRow(lines[1]) : [];
  const cols = header.length;
  const align = header.map((_, i) => {
    const d = delim[i] || '';
    if (/^:-+:$/.test(d)) return 'center';
    if (/^-+:$/.test(d)) return 'right';
    if (/^:-+$/.test(d)) return 'left';
    return null;
  });
  const cells = [header, ...lines.slice(2).map(splitRow)].map((r) => {
    const row = r.slice(0, cols);
    while (row.length < cols) row.push('');
    return row;
  });
  if (cells.length < 2) cells.push(Array(cols).fill(''));
  return { cells, align };
}

const esc = (v) => v.replace(/\|/g, '\\|').replace(/\n/g, ' ');

function serialize({ cells, align }) {
  const row = (r) => '| ' + r.map(esc).join(' | ') + ' |';
  const delim = align.map((a) => (a === 'center' ? ':---:' : a === 'right' ? '---:' : a === 'left' ? ':---' : '---'));
  return [row(cells[0]), '| ' + delim.join(' | ') + ' |', ...cells.slice(1).map(row)].join('\n');
}

// ---- Localizar la tabla que corresponde a un widget ----

function tableRange(view, wrap) {
  let pos;
  try { pos = view.posAtDOM(wrap); } catch { return null; }
  let n = syntaxTree(view.state).resolveInner(pos, 1);
  while (n && n.name !== 'Table') n = n.parent;
  return n ? { from: n.from, to: n.to } : null;
}

function commit(wrap, view, model) {
  const text = serialize(model);
  wrap._text = text; // el DOM ya refleja este texto: updateDOM no tendrá que reconstruirlo
  const r = tableRange(view, wrap);
  if (!r || view.state.sliceDoc(r.from, r.to) === text) return;
  view.dispatch({ changes: { from: r.from, to: r.to, insert: text }, userEvent: 'input.table' });
}

// ---- Render del widget ----

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function focusCell(wrap, r, c, selectAll = false) {
  const cols = wrap._model.cells[0].length;
  const inp = wrap.querySelectorAll('input')[r * cols + c];
  if (inp) {
    inp.focus();
    if (selectAll) inp.select();
    else inp.setSelectionRange(inp.value.length, inp.value.length);
  }
}

function renderTable(wrap, view, model, focus) {
  wrap._model = model;
  wrap.textContent = '';
  const cols = model.cells[0].length;
  const cur = () => ({ r: wrap._r ?? model.cells.length - 1, c: wrap._c ?? cols - 1 });

  const apply = (nextFocus) => {
    commit(wrap, view, model);
    renderTable(wrap, view, model, nextFocus);
    view.requestMeasure();
  };

  const tools = el('div', 'tbl-tools');
  const tool = (label, title, fn) => {
    const b = el('button', null, label);
    b.title = title;
    b.type = 'button';
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', fn);
    tools.append(b);
  };
  tool('+ Fila', 'Insertar fila debajo de la celda activa', () => {
    const { r, c } = cur();
    const at = r + 1;
    model.cells.splice(at, 0, Array(cols).fill(''));
    apply({ r: at, c });
  });
  tool('− Fila', 'Eliminar la fila de la celda activa', () => {
    const { r, c } = cur();
    if (r === 0 || model.cells.length <= 2) return;
    model.cells.splice(r, 1);
    apply({ r: Math.min(r, model.cells.length - 1), c });
  });
  tool('+ Columna', 'Insertar columna a la derecha de la celda activa', () => {
    const { r, c } = cur();
    const at = c + 1;
    model.cells.forEach((row) => row.splice(at, 0, ''));
    model.align.splice(at, 0, null);
    apply({ r, c: at });
  });
  tool('− Columna', 'Eliminar la columna de la celda activa', () => {
    const { r, c } = cur();
    if (cols <= 1) return;
    model.cells.forEach((row) => row.splice(c, 1));
    model.align.splice(c, 1);
    apply({ r, c: Math.min(c, cols - 2) });
  });
  tool('Eliminar tabla', 'Eliminar la tabla entera (se puede deshacer con Ctrl+Z)', () => {
    const r = tableRange(view, wrap);
    if (!r) return;
    const to = Math.min(view.state.doc.length, r.to + 1);
    view.dispatch({ changes: { from: r.from, to }, userEvent: 'delete.table' });
    view.focus();
  });
  wrap.append(tools);

  const table = el('table');
  model.cells.forEach((row, r) => {
    const tr = el('tr');
    row.forEach((val, c) => {
      const td = el(r === 0 ? 'th' : 'td');
      const inp = el('input');
      inp.type = 'text';
      inp.value = val;
      inp.spellcheck = false;
      if (model.align[c]) inp.style.textAlign = model.align[c];
      inp.addEventListener('focus', () => { wrap._r = r; wrap._c = c; });
      inp.addEventListener('input', () => {
        model.cells[r][c] = inp.value;
        commit(wrap, view, model);
      });
      inp.addEventListener('keydown', (e) => {
        const rows = model.cells.length;
        const go = (nr, nc) => { e.preventDefault(); focusCell(wrap, nr, nc); };
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (c > 0) go(r, c - 1); else if (r > 0) go(r - 1, cols - 1); else e.preventDefault();
          } else if (c < cols - 1) go(r, c + 1);
          else if (r < rows - 1) go(r + 1, 0);
          else { e.preventDefault(); model.cells.push(Array(cols).fill('')); apply({ r: rows, c: 0 }); }
        } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
          if (r < rows - 1) go(r + 1, c);
          else if (e.key === 'Enter') { e.preventDefault(); model.cells.push(Array(cols).fill('')); apply({ r: rows, c }); }
        } else if (e.key === 'ArrowUp') {
          if (r > 0) go(r - 1, c);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          view.focus();
        }
      });
      td.append(inp);
      tr.append(td);
    });
    table.append(tr);
  });
  wrap.append(table);

  if (focus) focusCell(wrap, focus.r, focus.c);
}

class TableWidget extends WidgetType {
  constructor(text) {
    super();
    this.text = text;
  }
  eq(other) {
    return other.text === this.text;
  }
  toDOM(view) {
    const wrap = el('div', 'cm-table-widget');
    wrap._text = this.text;
    renderTable(wrap, view, parseTable(this.text));
    return wrap;
  }
  updateDOM(dom, view) {
    // Si el DOM ya refleja este texto (cambio hecho desde el propio widget), se conserva el foco.
    if (dom._text !== this.text) {
      dom._text = this.text;
      renderTable(dom, view, parseTable(this.text));
    }
    return true;
  }
  ignoreEvent() {
    return true;
  }
}

function buildTables(state) {
  const out = [];
  syntaxTree(state).iterate({
    enter(n) {
      if (n.name === 'Table') {
        out.push(
          Decoration.replace({ widget: new TableWidget(state.sliceDoc(n.from, n.to)), block: true }).range(n.from, n.to),
        );
        return false;
      }
    },
  });
  return Decoration.set(out);
}

export const tableField = StateField.define({
  create: buildTables,
  update(value, tr) {
    return tr.docChanged || syntaxTree(tr.state) !== syntaxTree(tr.startState) ? buildTables(tr.state) : value;
  },
  provide: (f) => [
    EditorView.decorations.from(f),
    EditorView.atomicRanges.of((view) => view.state.field(f)),
  ],
});

// Lleva el foco a la primera celda de la tabla que empieza en `pos`.
export function focusTableAt(view, pos) {
  for (const w of view.dom.querySelectorAll('.cm-table-widget')) {
    let p;
    try { p = view.posAtDOM(w); } catch { continue; }
    if (p === pos) {
      focusCell(w, 0, 0, true);
      return true;
    }
  }
  return false;
}
