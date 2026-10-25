// Plugin de ejemplo: índice de títulos del documento activo.
// Muestra cómo se usa la API: panel lateral, comando, botón de cinta, barra de estado, eventos y ajustes.

// Títulos de un texto Markdown, ignorando lo que haya dentro de bloques de código.
function titulos(texto) {
  const salida = [];
  let enBloque = false;
  let pos = 0;
  for (const linea of texto.split('\n')) {
    if (/^\s*(```|~~~)/.test(linea)) enBloque = !enBloque;
    else if (!enBloque) {
      const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(linea);
      if (m) salida.push({ nivel: m[1].length, texto: m[2], pos });
    }
    pos += linea.length + 1;
  }
  return salida;
}

export function activate(plumd) {
  const { editor, ui, settings, on } = plumd;
  let contenedor = null;

  const estado = ui.statusBar.addItem({
    id: 'titulos',
    text: '',
    title: 'Número de títulos del documento. Un clic abre el índice.',
    onClick: () => ui.showPanel('indice'),
  });

  function pintar() {
    const lista = titulos(editor.getActive().text);
    estado.update({ text: `${lista.length} ${lista.length === 1 ? 'título' : 'títulos'}` });
    if (!contenedor) return;
    const maxNivel = Number(settings.get('niveles'));
    const sangrar = settings.get('sangria');
    contenedor.textContent = '';
    const visibles = lista.filter((t) => t.nivel <= maxNivel);
    if (!visibles.length) {
      const p = document.createElement('p');
      p.textContent = 'Este documento no tiene títulos.';
      p.style.cssText = 'padding:12px;color:var(--muted)';
      contenedor.append(p);
      return;
    }
    for (const t of visibles) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t.texto;
      b.title = `Título ${t.nivel}`;
      b.style.cssText = [
        'display:block;width:100%;text-align:left;border:0;background:transparent;color:var(--text);cursor:pointer',
        `padding:4px 10px 4px ${10 + (sangrar ? (t.nivel - 1) * 14 : 0)}px`,
        `font-weight:${t.nivel <= 2 ? 600 : 400};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
      ].join(';');
      b.addEventListener('click', () => editor.goto(t.pos));
      contenedor.append(b);
    }
  }

  ui.registerPanel({
    id: 'indice',
    title: 'Índice',
    mount(el) {
      contenedor = el;
      pintar();
      return { onShow: pintar, destroy: () => { contenedor = null; } };
    },
  });

  plumd.commands.register({
    id: 'indice.mostrar',
    title: 'Mostrar el índice de títulos',
    run: () => ui.showPanel('indice'),
  });

  ui.ribbon.addGroup({
    tab: 'view',
    label: 'Índice',
    items: [{ command: 'indice.mostrar', label: 'Índice de títulos', icon: 'sidebar', title: 'Mostrar el índice de títulos' }],
  });

  // Se repinta cuando cambia el documento o los ajustes.
  on('document:activated', pintar);
  on('document:opened', pintar);
  on('document:changed', pintar);
  settings.onChange(pintar);
  pintar();
}
