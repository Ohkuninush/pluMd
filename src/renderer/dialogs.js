import { relativeTo } from './images.js';

// Diálogo modal genérico. fields: [{ id, label, value, placeholder, browse }]
// Devuelve { [id]: valor } | { remove: true } | null (cancelado).
export function askForm({ title, fields, removable = false, okLabel = 'Aceptar' }) {
  const host = document.getElementById('dlg');
  host.textContent = '';
  const form = document.createElement('form');
  const h = document.createElement('h3');
  h.textContent = title;
  form.append(h);

  const inputs = {};
  for (const f of fields) {
    const label = document.createElement('label');
    label.textContent = f.label;
    const row = document.createElement('div');
    row.className = 'dlg-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.value = f.value || '';
    if (f.placeholder) input.placeholder = f.placeholder;
    inputs[f.id] = input;
    row.append(input);
    if (f.browse) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Examinar…';
      b.addEventListener('click', async () => {
        const v = await f.browse();
        if (v) input.value = v;
      });
      row.append(b);
    }
    label.append(row);
    form.append(label);
  }

  const actions = document.createElement('div');
  actions.className = 'dlg-actions';
  const mk = (text, type, cls) => {
    const b = document.createElement('button');
    b.type = type;
    b.textContent = text;
    if (cls) b.className = cls;
    return b;
  };
  const bRemove = removable ? mk('Quitar', 'button') : null;
  const spacer = document.createElement('span');
  spacer.className = 'spacer';
  const bCancel = mk('Cancelar', 'button');
  const bOk = mk(okLabel, 'submit', 'primary');
  if (bRemove) actions.append(bRemove);
  actions.append(spacer, bCancel, bOk);
  form.append(actions);
  host.append(form);
  host.hidden = false;

  const first = fields.find((f) => !f.value) || fields[0];
  inputs[first.id].focus();

  return new Promise((resolve) => {
    const done = (value) => {
      host.hidden = true;
      host.textContent = '';
      host.removeEventListener('keydown', onKey);
      resolve(value);
    };
    const onKey = (e) => { if (e.key === 'Escape') done(null); };
    host.addEventListener('keydown', onKey);
    bCancel.addEventListener('click', () => done(null));
    if (bRemove) bRemove.addEventListener('click', () => done({ remove: true }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const out = {};
      for (const f of fields) out[f.id] = inputs[f.id].value.trim();
      const req = fields.find((f) => f.required && !out[f.id]);
      if (req) return inputs[req.id].focus();
      done(out);
    });
  });
}

export const askLink = ({ text = '', url = '', existing = false }) =>
  askForm({
    title: existing ? 'Editar vínculo' : 'Insertar vínculo',
    removable: existing,
    fields: [
      { id: 'text', label: 'Texto', value: text },
      { id: 'url', label: 'Dirección', value: url, placeholder: 'https://…', required: true },
    ],
  });

// getFile() devuelve la ruta del fichero abierto (para guardar rutas relativas).
export const askImage = ({ alt = '', url = '', existing = false }, getFile) =>
  askForm({
    title: existing ? 'Editar imagen' : 'Insertar imagen',
    removable: existing,
    fields: [
      {
        id: 'url',
        label: 'Ruta o dirección web',
        value: url,
        placeholder: 'imagenes/plano.png  o  https://…',
        required: true,
        browse: async () => {
          const p = await window.api.pickImage();
          if (!p) return null;
          const file = getFile();
          return file ? relativeTo(file, p) : p.replace(/\\/g, '/');
        },
      },
      { id: 'alt', label: 'Texto alternativo', value: alt },
    ],
  });
