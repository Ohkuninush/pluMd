# Cómo colaborar

Gracias por el interés en PluMd. Se aceptan errores, ideas y cambios de código.

## Avisar de un error o proponer una mejora

Abre un "Issue" en GitHub. Indica qué hacías, qué esperabas que pasara y qué pasó. Si el problema es con un fichero `.md` concreto, adjunta un ejemplo mínimo que lo reproduzca (sin datos privados).

## Proponer un cambio de código (Pull Request)

1. Haz un "fork" del repositorio y clónalo.
2. Crea una rama para tu cambio, por ejemplo `mejora-tablas`.
3. Instala y ejecuta la aplicación:

   ```bash
   npm install
   npm start
   ```

4. Haz el cambio. Mantén el estilo del código que ya hay: mismos nombres, mismo nivel de comentarios y comentarios en español.
5. Comprueba que la aplicación arranca y que lo que has tocado funciona. Si cambias el comportamiento del editor, prueba también el modo Lectura y el modo Código.
6. Abre un Pull Request describiendo qué cambia y por qué. Un cambio pequeño y enfocado se revisa antes que uno grande.

El responsable del proyecto revisa cada Pull Request antes de aceptarlo y puede pedir ajustes.

## Qué no incluir en un Pull Request

- Ficheros generados: `node_modules/`, `dist/` y `release/` están excluidos a propósito.
- Datos personales, contraseñas, claves o rutas de tu equipo.
- Código copiado de otros proyectos sin indicar su origen y su licencia.

## Licencia

Al enviar un cambio aceptas que se publique bajo la licencia MIT del proyecto (ver `LICENSE`).
