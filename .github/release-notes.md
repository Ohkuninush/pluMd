PluMd 0.2.5: tablas con columnas ajustables y texto que se ajusta a la celda, y pestañas que se pueden cerrar todas.

## Descarga

- `PluMd-Setup-0.2.5.exe`: instalador. Permite elegir la carpeta, crea el acceso en el menú Inicio y registra los `.md` para abrirlos con doble clic.
- `PluMd-portable-0.2.5.exe`: no necesita instalación. Descárgalo y ejecútalo con doble clic.
- `SHA256SUMS.txt`: sumas de comprobación de los dos `.exe`. Los ficheros los compila GitHub a partir del código de este repositorio.

## Antes de ejecutarlo

- Windows SmartScreen puede mostrar "Windows protegió su PC", porque el programa aún no está firmado. Pulsa "Más información" y luego "Ejecutar de todos modos".
- El portable no registra los `.md` como suyos. Para abrirlos con doble clic, usa "Abrir con" sobre un `.md` una vez y elige PluMd, o usa el instalador.
- Es una versión de trabajo (0.2.5): todavía no hay conexión MCP ni catálogo de plugins.

## Novedades de la 0.2.5

- Tablas: el ancho de las columnas se cambia arrastrando el borde derecho de la cabecera (doble clic para igualar). El ancho se guarda en el propio Markdown como número relativo de guiones de la fila delimitadora, la convención de Pandoc, así que otros visores siguen viendo una tabla normal.
- Tablas: el texto de las celdas se ajusta al ancho de la columna en vez de cortarse; la fila crece en alto.
- Pestañas: se pueden cerrar todas. Sin documentos abiertos aparece una pantalla con los botones Nuevo y Abrir, y la numeración de «sin título» vuelve a empezar.

## Novedades de la 0.2.1 a la 0.2.4

- Instalador de Windows (NSIS) junto al portable.
- Pegar imágenes: Ctrl+V con una captura la guarda en `imagenes/aammdd_hhmm.png` junto al documento y deja el vínculo. El documento debe estar guardado.
- Panel de carpetas: escribir una ruta en la caja y pulsar Intro abre el diálogo de carpeta ya situado en ella (por ejemplo `C:\Datos` o `\\servidor\recurso`).
- Seguridad: las junctions y enlaces que salen de la carpeta abierta no se listan ni se usan; leer y guardar solo funciona sobre ficheros elegidos por el usuario o de la carpeta abierta (también para plugins); guardado atómico con aviso de error; imágenes remotas bloqueadas hasta pulsar «Cargar».
- Borrar en una unidad de red es posible con una confirmación aparte que avisa de que es definitivo (no hay Papelera). En local va a la Papelera.
- Pruebas automáticas (`npm test`) en cada Pull Request.

## Qué incluye

- Vista de lectura editable, sin símbolos Markdown, y vista de código.
- Cinta de opciones a todo el ancho: estilos de título, formato, listas, tareas, tablas editables, imágenes, vínculos, bloques de código con resaltado y búsqueda.
- Sistema de plugins (aspectos, comandos, cinta, paneles, extensiones del editor y ajustes) que se gestiona en Ayuda > Administrar plugins. Guía en `docs/plugins/README.md`.
- Paleta de comandos (Ctrl+Mayús+P) y menú `/` en el editor.
- Pestañas de documentos y panel de carpetas con menú de botón derecho (nuevo, renombrar, copiar, pegar y borrar).
- Vínculos a carpetas locales o de red, además de páginas web.
- Títulos plegables, colores personalizables y tres aspectos (PluMd, Windows y Mac) en modo claro y oscuro.

Licencia MIT.
