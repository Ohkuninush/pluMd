// Las librerías de CodeMirror de PluMd, que los plugins reciben en plumd.cm. Los plugins no deben incluir su
// propia copia: dos copias distintas de CodeMirror no son compatibles entre sí y las extensiones fallarían.
import * as state from '@codemirror/state';
import * as view from '@codemirror/view';
import * as language from '@codemirror/language';
import * as commands from '@codemirror/commands';
import * as search from '@codemirror/search';
import * as langMarkdown from '@codemirror/lang-markdown';
import * as lezerHighlight from '@lezer/highlight';
import * as lezerMarkdown from '@lezer/markdown';

export const cm = Object.freeze({
  state,
  view,
  language,
  commands,
  search,
  markdown: langMarkdown,
  lezer: Object.freeze({ highlight: lezerHighlight, markdown: lezerMarkdown }),
});
