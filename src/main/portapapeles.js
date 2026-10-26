// Lectura de imágenes del portapapeles. Desde Electron 45 el portapapeles es asíncrono
// (read() devuelve ClipboardItem[]) y ya no existe readImage().
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Devuelve la imagen del portapapeles como PNG (Buffer), o null si no hay ninguna.
// `nativeImage` solo se usa si la imagen llega en otro formato (p. ej. JPEG) para pasarla a PNG.
async function readClipboardPng(clipboard, nativeImage) {
  for (const item of await clipboard.read()) {
    const type = item.types.find((t) => t === 'image/png') || item.types.find((t) => /^image\//.test(t));
    if (!type) continue;
    let buf = Buffer.from(await (await item.getType(type)).arrayBuffer());
    if (!buf.subarray(0, 8).equals(PNG_MAGIC)) {
      const img = nativeImage.createFromBuffer(buf);
      if (img.isEmpty()) continue;
      buf = img.toPNG();
    }
    return buf;
  }
  return null;
}

module.exports = { readClipboardPng, PNG_MAGIC };
