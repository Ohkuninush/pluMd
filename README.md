# Visor MD

Visor y editor de ficheros Markdown (`.md`) para Windows, con cinta de opciones tipo Word. Pensado como primer servicio de una plataforma de herramientas internas con arquitectura de plugins.

## Qué hace

- Abre un fichero `.md` suelto (doble clic, botón Abrir o Ctrl+O). No necesita carpeta de trabajo.
- Dos vistas: Lectura (documento limpio y editable, sin símbolos Markdown) y Código (el Markdown tal cual). Ctrl+E alterna.
- Cinta con pestañas Inicio, Insertar y Vista: estilos de título, negrita, cursiva, subrayado, listas, tareas, tablas editables, imágenes, vínculos, bloques de código con resaltado, búsqueda y zoom.
- Tema claro y oscuro.
- No borra ni mueve ficheros. Avisa si el fichero cambió en disco desde que se abrió.

## Desarrollo

Requisitos: Node.js 24 o superior.

```bash
npm install
npm start          # compila y abre la aplicación
npm run dist       # genera el instalador y la versión portable en release/
```

## Estructura

- `src/main/`: proceso principal de Electron (ventana, ficheros, portapapeles).
- `src/renderer/`: interfaz (editor CodeMirror 6, cinta, tablas, imágenes, diálogos).
- `scripts/build.js`: empaquetado del renderer con esbuild.

## Estado

Primera versión de trabajo. Pendiente: API de plugins y conexión MCP para agentes.

## Colaborar

Las propuestas de cambio (Pull Requests) y los avisos de errores (Issues) son bienvenidos. Las normas están en [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

[MIT](LICENSE) © 2026 Jorge Ferreira Rey
