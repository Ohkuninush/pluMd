const test = require('node:test');
const assert = require('node:assert/strict');
const { readClipboardPng, PNG_MAGIC } = require('../src/main/portapapeles');

const png = Buffer.concat([PNG_MAGIC, Buffer.from('datos')]);
const item = (types) => ({
  types: Object.keys(types),
  getType: async (t) => new Blob([types[t]]),
});
const clip = (...items) => ({ read: async () => items });
const noNative = { createFromBuffer: () => { throw new Error('no debería convertirse'); } };

test('devuelve el PNG cuando el portapapeles lo trae', async () => {
  const r = await readClipboardPng(clip(item({ 'text/html': '<b>x</b>' }), item({ 'image/png': png })), noNative);
  assert.deepEqual(r, png);
});

test('sin imagen devuelve null', async () => {
  assert.equal(await readClipboardPng(clip(item({ 'text/plain': 'hola' })), noNative), null);
  assert.equal(await readClipboardPng(clip(), noNative), null);
});

test('una imagen que no es PNG se convierte', async () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const nativeImage = { createFromBuffer: (b) => ({ isEmpty: () => !b.equals(jpeg), toPNG: () => png }) };
  assert.deepEqual(await readClipboardPng(clip(item({ 'image/jpeg': jpeg })), nativeImage), png);
});

test('una imagen ilegible se ignora', async () => {
  const nativeImage = { createFromBuffer: () => ({ isEmpty: () => true }) };
  assert.equal(await readClipboardPng(clip(item({ 'image/bmp': Buffer.from([1, 2, 3]) })), nativeImage), null);
});
