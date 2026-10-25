# Plugins de ejemplo

Tres plugins para aprender cómo funciona la API. Cada uno es una carpeta que se puede instalar tal cual. La guía completa está en [docs/plugins/README.md](../docs/plugins/README.md).

| Carpeta | Qué enseña |
| --- | --- |
| `sepia` | Un skin sin código: solo `manifest.json` y un CSS. |
| `indice` | Panel lateral, comando, botón de cinta, elemento de la barra de estado, eventos y ajustes. |
| `grafico` | Renderizador de bloques de código: dibuja los bloques ```` ```barras ```` como un gráfico. |

## Probarlos sin instalarlos

Arranca PluMd con la carpeta del plugin y se activa solo:

```bash
PluMd.exe --plugin-dev="C:\ruta\a\plugins-ejemplo\indice"
```

Se pueden repetir varios `--plugin-dev` para cargar más de uno.

## Instalarlos

1. En PluMd, Ayuda > Administrar plugins > Instalar desde carpeta, y elige la carpeta del plugin.
2. Actívalo en la lista. La primera vez, PluMd muestra sus permisos y pide confirmación.

Para usar el de gráficos, escribe en un documento:

````markdown
```barras
Ventas: 12
Costes: 7
Beneficio: 5
```
````
