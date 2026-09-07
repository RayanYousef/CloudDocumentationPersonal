/**
 * The editor's visual theme, as one module: palette tokens, the app chrome, the MDXEditor surface mapping
 * and the CodeMirror extensions. Import once from the entry point; consumers only need the two exports.
 * Swapping the look means adding a sibling module and importing that instead; nothing else changes.
 */
import './tokens.css';
import './arcade.css';

export { arcadeCodeMirror } from './codeMirror.js';

/** Class MDXEditor puts on both its root and the portal container its popovers/dialogs render into. */
export const EDITOR_THEME_CLASS = 'arcade-theme';
