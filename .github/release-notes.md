PluMd 0.2.4: corrige el pegado de imágenes de la 0.2.3, que fallaba con el error «clipboard.readImage is not a function».

## Descarga

- `PluMd-Setup-0.2.4.exe`: instalador. Permite elegir la carpeta, crea el acceso en el menú Inicio y registra los `.md` para abrirlos con doble clic.
- `PluMd-portable-0.2.4.exe`: no necesita instalación. Descárgalo y ejecútalo con doble clic.
- `SHA256SUMS.txt`: sumas de comprobación de los dos `.exe`. Los ficheros los compila GitHub a partir del código de este repositorio.

## Antes de ejecutarlo

- Windows SmartScreen puede mostrar "Windows protegió su PC", porque el programa aún no está firmado. Pulsa "Más información" y luego "Ejecutar de todos modos".
- El portable no registra los `.md` como suyos. Para abrirlos con doble clic, usa "Abrir con" sobre un `.md` una vez y elige PluMd, o usa el instalador.
- Es una versión de trabajo (0.2.4): todavía no hay conexión MCP ni catálogo de plugins.

## Novedades

- Panel de carpetas: al escribir una ruta (por ejemplo `C:\Datos` o `\servidorecurso`) en la caja del panel y pulsar Intro, se abre el diálogo de carpeta ya situado en esa ruta; al aceptar, pasa a ser la carpeta del panel. Sirve para saltar de una unidad de red a una local y al revés.
- Pegar imágenes (0.2.3, arreglado en la 0.2.4): con una captura o imagen en el portapapeles, Ctrl+V (o el botón Pegar) la guarda como PNG en una carpeta `imagenes` junto al documento, con nombre `aammdd_hhmm.png` (por ejemplo `261026_1432.png`; si ya existe, `_2`, `_3`...), y deja el vínculo en el texto. El documento debe estar guardado antes.
- Novedades de la 0.2.2:
- Las junctions y enlaces simbólicos que apuntan fuera de la carpeta abierta ya no se listan, y no se puede crear, renombrar, copiar ni borrar a través de ellos.
- Leer y guardar solo funciona sobre ficheros que el usuario eligió (diálogo, arrastre, vínculo, doble clic) o sobre documentos de la carpeta abierta. Esto también limita a los plugins.
- El guardado es atómico (fichero temporal y cambio de nombre): un corte a mitad no deja el documento truncado. Si falla, se avisa y el documento sigue marcado como no guardado.
- Borrar en una unidad de red ya es posible, con una confirmación aparte que avisa de que es definitivo (no hay Papelera). En carpetas locales sigue yendo a la Papelera.
- Las imágenes remotas (https) no se cargan hasta pulsar «Cargar» en cada una.
- Pruebas automáticas (`npm test`) que se ejecutan en cada Pull Request.
- Sistema de plugins: aspectos, comandos, botones y grupos de cinta, paneles laterales, bloques de código con contenido propio, extensiones del editor y ajustes. Se gestionan en Ayuda > Administrar plugins. Guía en `docs/plugins/README.md` y tres ejemplos en `plugins-ejemplo/`.
- Paleta de comandos (Ctrl+Mayús+P) y menú `/` en el editor para insertar títulos, listas, tablas y más.
- Vínculos a carpetas locales o de red, además de páginas web. Ctrl+clic abre la carpeta en el Explorador.
- El panel de carpetas aparece abierto por defecto, con cruz para cerrarlo y opción en Vista para volver a abrirlo.
- Los diálogos se apilan y un texto entre corchetes sin enlace conserva los corchetes en modo Lectura.

## Qué incluye

- Vista de lectura editable, sin símbolos Markdown, y vista de código.
- Cinta de opciones a todo el ancho: estilos de título, formato, listas, tareas, tablas editables, imágenes, vínculos, bloques de código con resaltado y búsqueda.
- Pestañas de documentos y panel de carpetas con menú de botón derecho (nuevo, renombrar, copiar, pegar y borrar a la Papelera, que no se permite en unidades de red).
- Títulos plegables, colores personalizables y tres aspectos (PluMd, Windows y Mac) en modo claro y oscuro.

Licencia MIT.
