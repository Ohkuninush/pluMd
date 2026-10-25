// Registros del núcleo: lo que puede ampliarse (comandos, cinta, editor, bloques, paneles, barra de estado,
// menús, eventos). El propio programa y los plugins usan los mismos registros. Cada contribución lleva el
// id de su plugin (owner) para poder retirarla entera al desactivarlo. Los programas del núcleo usan owner "core".

const CORE = 'core';

// ---- Eventos ----
const listeners = new Map();

export function on(event, cb, owner = CORE) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  const entry = { cb, owner };
  listeners.get(event).add(entry);
  return { dispose: () => listeners.get(event)?.delete(entry) };
}

let errorSink = (owner, e) => console.error(`[plugin ${owner}]`, e);
export const setErrorSink = (fn) => { errorSink = fn; };
export const reportError = (owner, e) => errorSink(owner, e);

export function emit(event, payload) {
  for (const entry of [...(listeners.get(event) || [])]) {
    try {
      entry.cb(payload);
    } catch (e) {
      reportError(entry.owner, e);
    }
  }
}

// ---- Contribuciones ----
// Cada tipo es una lista de entradas { owner, ... }. Al cambiar una lista se emite "registry:<tipo>".
const lists = {
  ribbon: [], // { owner, kind: 'group' | 'tab', ... }
  extensions: [], // { owner, ext } extensiones de CodeMirror
  blocks: [], // { owner, language, render }
  panels: [], // { owner, id, title, mount }
  status: [], // { owner, id, text, title, onClick }
  context: [], // { owner, target, label, run }
  commands: [], // { owner, id, title, keys, run }
};

function add(kind, entry) {
  lists[kind].push(entry);
  emit(`registry:${kind}`);
  return {
    dispose: () => {
      const i = lists[kind].indexOf(entry);
      if (i >= 0) {
        lists[kind].splice(i, 1);
        emit(`registry:${kind}`);
      }
    },
  };
}

export const items = (kind) => lists[kind];

// Retira una entrada concreta (p. ej. una extensión de editor que resultó inválida).
export function removeItem(kind, entry) {
  const i = lists[kind].indexOf(entry);
  if (i >= 0) {
    lists[kind].splice(i, 1);
    emit(`registry:${kind}`);
  }
}

// Retira todo lo aportado por un plugin.
export function disposeOwner(owner) {
  let changed = [];
  for (const kind of Object.keys(lists)) {
    const before = lists[kind].length;
    lists[kind] = lists[kind].filter((e) => e.owner !== owner);
    if (lists[kind].length !== before) changed.push(kind);
  }
  for (const set of listeners.values()) for (const e of [...set]) if (e.owner === owner) set.delete(e);
  for (const kind of changed) emit(`registry:${kind}`);
}

// ---- Comandos ----
export function registerCommand({ id, title, keys, run }, owner = CORE) {
  if (!id || typeof run !== 'function') throw new Error('Un comando necesita "id" y "run".');
  const existing = lists.commands.find((c) => c.id === id);
  if (existing) throw new Error(`Ya existe un comando con el id "${id}".`);
  return add('commands', { owner, id, title, keys, run });
}

// Comandos declarados en el manifiesto: existen antes de cargar el código del plugin. Si el plugin
// registra después el mismo id con su lógica, sustituye a este aviso.
export function registerStubCommand({ id, title, keys, run }, owner) {
  return add('commands', { owner, id, title, keys, run, stub: true });
}

export function replaceStub(id, owner) {
  const i = lists.commands.findIndex((c) => c.id === id && c.owner === owner && c.stub);
  if (i >= 0) lists.commands.splice(i, 1);
}

export const getCommand = (id) => lists.commands.find((c) => c.id === id && !c.stub) || lists.commands.find((c) => c.id === id);

export async function executeCommand(id, arg) {
  const c = getCommand(id);
  if (!c) throw new Error(`No existe el comando "${id}".`);
  try {
    return await c.run(arg);
  } catch (e) {
    reportError(c.owner, e);
    throw e;
  }
}

// ---- Cinta ----
export const addRibbonGroup = (def, owner) => add('ribbon', { owner, kind: 'group', ...def });
export const addRibbonTab = (def, owner) => add('ribbon', { owner, kind: 'tab', ...def });

// ---- Editor ----
export const addEditorExtension = (ext, owner) => add('extensions', { owner, ext });

export function addBlockRenderer({ language, render }, owner) {
  const lang = String(language || '').toLowerCase().trim();
  if (!lang || typeof render !== 'function') throw new Error('Un renderizador de bloques necesita "language" y "render".');
  if (lists.blocks.some((b) => b.language === lang)) throw new Error(`Ya hay un renderizador para el lenguaje "${lang}".`);
  return add('blocks', { owner, language: lang, render });
}
export const getBlockRenderer = (lang) => lists.blocks.find((b) => b.language === String(lang || '').toLowerCase());

// ---- Paneles, estado y menús ----
export function addPanel({ id, title, mount }, owner) {
  if (!id || !title || typeof mount !== 'function') throw new Error('Un panel necesita "id", "title" y "mount".');
  if (lists.panels.some((p) => p.id === `${owner}:${id}`)) throw new Error(`Ya existe el panel "${id}".`);
  return add('panels', { owner, id: `${owner}:${id}`, title, mount });
}

export function addStatusItem({ id, text = '', title = '', onClick }, owner) {
  const entry = { owner, id: `${owner}:${id}`, text, title, onClick };
  const handle = add('status', entry);
  return {
    update: (patch) => {
      Object.assign(entry, patch);
      emit('registry:status');
    },
    dispose: handle.dispose,
  };
}

export const addContextItem = (def, owner) => add('context', { owner, ...def });
export const contextItems = (target) => lists.context.filter((c) => c.target === target);
