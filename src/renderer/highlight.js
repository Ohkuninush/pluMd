import { HighlightStyle, syntaxHighlighting, LanguageDescription, StreamLanguage } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { powerShell } from '@codemirror/legacy-modes/mode/powershell';
import { octave } from '@codemirror/legacy-modes/mode/octave';
import { c, cpp, java } from '@codemirror/legacy-modes/mode/clike';

const stream = (mode) => async () => StreamLanguage.define(mode);
const lang = (name, alias, load) => LanguageDescription.of({ name, alias, load: async () => load() });

// Lenguajes disponibles para los bloques ``` (se cargan solo cuando aparecen).
export const LANGS = [
  ['JavaScript / TypeScript', ['js', 'javascript', 'jsx', 'ts', 'typescript', 'tsx', 'mjs']],
  ['Python', ['py', 'python']],
  ['MATLAB / Octave', ['matlab', 'octave', 'm']],
  ['C', ['c']],
  ['C++', ['cpp', 'c++']],
  ['Java', ['java']],
  ['SQL', ['sql']],
  ['JSON', ['json']],
  ['YAML', ['yaml', 'yml']],
  ['XML', ['xml']],
  ['HTML', ['html']],
  ['CSS', ['css']],
  ['Shell', ['bash', 'sh', 'shell']],
  ['PowerShell', ['powershell', 'ps1']],
];

export const codeLanguages = [
  lang('JavaScript', ['js', 'javascript', 'jsx', 'ts', 'typescript', 'tsx', 'mjs'], () => javascript({ jsx: true, typescript: true })),
  lang('Python', ['py', 'python'], () => python()),
  lang('MATLAB', ['matlab', 'octave', 'm'], stream(octave)),
  lang('C', ['c'], stream(c)),
  lang('C++', ['cpp', 'c++'], stream(cpp)),
  lang('Java', ['java'], stream(java)),
  lang('SQL', ['sql'], () => sql()),
  lang('JSON', ['json', 'jsonc'], () => json()),
  lang('YAML', ['yaml', 'yml'], () => yaml()),
  lang('XML', ['xml', 'svg'], () => xml()),
  lang('HTML', ['html', 'htm'], () => html()),
  lang('CSS', ['css'], () => css()),
  lang('Shell', ['bash', 'sh', 'shell', 'zsh'], stream(shell)),
  lang('PowerShell', ['powershell', 'ps1', 'pwsh'], stream(powerShell)),
];

// Solo se colorean las etiquetas de código; los símbolos de Markdown los trata livePreview.
// Los colores salen de variables CSS (--hl-*), así que cambian con el tema.
export const codeHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [t.keyword, t.modifier, t.operatorKeyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword], class: 'hl-keyword' },
    { tag: [t.string, t.special(t.string), t.regexp, t.character], class: 'hl-string' },
    { tag: [t.number, t.bool, t.null, t.atom, t.integer, t.float], class: 'hl-number' },
    { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], class: 'hl-comment' },
    { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], class: 'hl-function' },
    { tag: [t.typeName, t.className, t.namespace, t.standard(t.name)], class: 'hl-type' },
    { tag: [t.propertyName, t.attributeName, t.definition(t.propertyName)], class: 'hl-prop' },
    { tag: [t.tagName, t.angleBracket], class: 'hl-tag' },
    { tag: [t.operator, t.compareOperator, t.logicOperator, t.arithmeticOperator], class: 'hl-operator' },
    { tag: [t.meta, t.processingInstruction], class: 'hl-meta' },
  ]),
);
