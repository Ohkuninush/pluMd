const test = require('node:test');
const assert = require('node:assert/strict');

const modelo = () => import('../src/renderer/tablaModelo.mjs');

test('una tabla normal conserva su texto y no tiene anchos propios', async () => {
  const { parseTable, serialize } = await modelo();
  const txt = '| A | B |\n| --- | --- |\n| 1 | 2 |';
  const t = parseTable(txt);
  assert.equal(t.widths, null);
  assert.equal(serialize(t), txt);
});

test('los guiones de la fila delimitadora se leen como anchos relativos', async () => {
  const { parseTable, serialize } = await modelo();
  const txt = '| A | B | C |\n| ---- | ---------------- | ---- |\n| 1 | 2 | 3 |';
  const t = parseTable(txt);
  assert.deepEqual(t.widths, [4, 16, 4]);
  assert.equal(serialize(t), txt);
});

test('la alineación se conserva junto a los anchos', async () => {
  const { parseTable, serialize } = await modelo();
  const txt = '| A | B | C |\n| :---- | :--------: | ------: |\n| 1 | 2 | 3 |';
  const t = parseTable(txt);
  assert.deepEqual(t.align, ['left', 'center', 'right']);
  assert.deepEqual(t.widths, [4, 8, 6]);
  assert.equal(serialize(t), txt);
});

test('ida y vuelta estable: parse(serialize(t)) da lo mismo', async () => {
  const { parseTable, serialize } = await modelo();
  const t = parseTable('| a \\| b | c |\n| :--- | ---: |\n| x | |');
  assert.deepEqual(parseTable(serialize(t)), t);
});

test('toDashes reparte en guiones relativos con mínimo 3', async () => {
  const { toDashes } = await modelo();
  assert.equal(toDashes([200, 200, 200]), null); // todo igual: ancho automático
  const d = toDashes([100, 500, 20]);
  assert.ok(d.every((n) => n >= 3));
  assert.ok(d[1] > d[0] && d[0] > d[2] - 1);
});

test('una fila de datos con más celdas que la cabecera se recorta, y con menos se completa', async () => {
  const { parseTable } = await modelo();
  const t = parseTable('| A | B |\n| --- | --- |\n| 1 | 2 | 3 |\n| solo |');
  assert.deepEqual(t.cells, [['A', 'B'], ['1', '2'], ['solo', '']]);
});
