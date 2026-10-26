// Modelo de tabla <-> texto Markdown (sin dependencias del editor, para poder probarlo aparte).
//
// Ancho de columnas: Markdown no tiene sintaxis de anchos, pero los editores (y Pandoc) usan el número de
// guiones de la fila delimitadora como ancho relativo. `widths` guarda ese número por columna, o null si
// todas tienen el mismo (ancho igual). Para otros visores no cambia nada: solo ven una tabla normal.

export function splitRow(line) {
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

export function parseTable(text) {
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
  const dashes = header.map((_, i) => ((delim[i] || '').match(/-/g) || []).length);
  const widths = dashes.some((n) => n < 1) || dashes.every((n) => n === dashes[0]) ? null : dashes;
  const cells = [header, ...lines.slice(2).map(splitRow)].map((r) => {
    const row = r.slice(0, cols);
    while (row.length < cols) row.push('');
    return row;
  });
  if (cells.length < 2) cells.push(Array(cols).fill(''));
  return { cells, align, widths };
}

const esc = (v) => v.replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function serialize({ cells, align, widths }) {
  const row = (r) => '| ' + r.map(esc).join(' | ') + ' |';
  const delim = align.map((a, i) => {
    const d = '-'.repeat(widths ? Math.max(1, widths[i]) : 3);
    return a === 'center' ? `:${d}:` : a === 'right' ? `${d}:` : a === 'left' ? `:${d}` : d;
  });
  return [row(cells[0]), '| ' + delim.join(' | ') + ' |', ...cells.slice(1).map(row)].join('\n');
}

// Anchos en píxeles -> guiones relativos (mínimo 3 por columna). null si salen todos iguales.
export function toDashes(px) {
  const total = px.reduce((a, b) => a + b, 0);
  const budget = Math.max(36, 12 * px.length);
  const d = px.map((w) => Math.max(3, Math.round((w / total) * budget)));
  return d.every((n) => n === d[0]) ? null : d;
}
