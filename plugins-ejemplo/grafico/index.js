// Plugin de ejemplo: dibuja bloques de código con el lenguaje "barras".
//
//   ```barras
//   Ventas: 12
//   Costes: 7
//   ```
//
// En el modo Lectura se ve el gráfico; en el modo Código (o al pulsar "Editar código") se ve el texto.

const NS = 'http://www.w3.org/2000/svg';

function datos(texto) {
  return texto
    .split('\n')
    .map((l) => /^\s*(.+?)\s*:\s*(-?\d+(?:[.,]\d+)?)\s*$/.exec(l))
    .filter(Boolean)
    .map((m) => ({ etiqueta: m[1], valor: Number(m[2].replace(',', '.')) }));
}

function el(tag, attrs, texto) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  if (texto != null) e.textContent = texto;
  return e;
}

// Los colores salen de las variables de PluMd, así que el gráfico sigue al aspecto y al modo claro u oscuro.
function dibujar(contenedor, texto) {
  contenedor.textContent = '';
  const filas = datos(texto);
  if (!filas.length) {
    contenedor.textContent = 'Escribe una línea por barra, con el formato «Etiqueta: valor».';
    contenedor.style.color = 'var(--muted)';
    return;
  }
  contenedor.style.color = '';
  const max = Math.max(...filas.map((f) => Math.abs(f.valor)), 1);
  const altoFila = 30;
  const margenIzq = 130;
  const ancho = 520;
  const svg = el('svg', { viewBox: `0 0 ${ancho} ${filas.length * altoFila + 8}`, width: '100%', role: 'img' });
  svg.style.maxWidth = '640px';
  filas.forEach((f, i) => {
    const y = 4 + i * altoFila;
    const largo = (Math.abs(f.valor) / max) * (ancho - margenIzq - 60);
    const t = el('text', { x: margenIzq - 8, y: y + 17, 'text-anchor': 'end', 'font-size': 13 }, f.etiqueta);
    t.style.fill = 'var(--text)';
    const barra = el('rect', { x: margenIzq, y: y + 3, width: Math.max(largo, 1), height: altoFila - 10, rx: 3 });
    barra.style.fill = f.valor < 0 ? '#c42b1c' : 'var(--accent)';
    const v = el('text', { x: margenIzq + largo + 8, y: y + 17, 'font-size': 12 }, String(f.valor));
    v.style.fill = 'var(--muted)';
    svg.append(t, barra, v);
  });
  contenedor.append(svg);
}

export function activate(plumd) {
  plumd.editor.registerBlockRenderer({
    language: 'barras',
    render(contenedor, texto) {
      dibujar(contenedor, texto);
      return {
        update: (nuevo) => dibujar(contenedor, nuevo),
      };
    },
  });

  plumd.commands.register({
    id: 'grafico.insertar',
    title: 'Insertar gráfico de barras',
    run: () => plumd.editor.insertAtCursor('\n```barras\nVentas: 12\nCostes: 7\nBeneficio: 5\n```\n'),
  });

  plumd.ui.ribbon.addGroup({
    tab: 'insert',
    label: 'Gráficos',
    items: [{ command: 'grafico.insertar', label: 'Gráfico de barras', icon: 'table', title: 'Insertar un gráfico de barras' }],
  });
}
