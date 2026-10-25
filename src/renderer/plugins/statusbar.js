import { items, on } from './registry.js';

// Elementos que los plugins añaden a la barra de estado, junto al contador de palabras.
export function initStatusItems() {
  const holder = document.getElementById('status-plugins');
  function render() {
    holder.textContent = '';
    for (const it of items('status')) {
      const span = document.createElement(it.onClick ? 'button' : 'span');
      span.className = 'status-item' + (it.onClick ? ' clickable' : '');
      if (it.onClick) {
        span.type = 'button';
        span.addEventListener('click', () => it.onClick());
      }
      span.textContent = it.text;
      if (it.title) span.title = it.title;
      holder.append(span);
    }
  }
  on('registry:status', render);
  render();
}
