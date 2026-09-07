import { EditorView } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/**
 * CodeMirror theme for fenced code blocks. MDXEditor always appends its own `basicLight` theme, so both
 * extensions are wrapped in Prec.highest to win the cascade. Every color is a CSS variable from tokens.css,
 * which is what makes the same extension correct in light and dark mode.
 */
const chrome = EditorView.theme({
  '&': { backgroundColor: 'var(--ed-code-bg)', color: 'var(--ed-text)' },
  '.cm-content': { caretColor: 'var(--ed-code-cursor)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--ed-code-cursor)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'var(--ed-code-selection)' },
  '.cm-activeLine': { backgroundColor: 'var(--ed-code-active-line)' },
  '.cm-gutters': { backgroundColor: 'var(--ed-code-bg)', color: 'var(--ed-code-gutter)', borderRight: '1px solid var(--ed-line)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--ed-code-active-line)', color: 'var(--ed-text)' },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': { backgroundColor: 'var(--ed-primary-soft)', outline: '1px solid var(--ed-line-strong)' },
  '.cm-selectionMatch': { backgroundColor: 'var(--ed-primary-soft)' },
  '.cm-tooltip': { backgroundColor: 'var(--ed-raised)', color: 'var(--ed-text)', border: '1px solid var(--ed-line-strong)' },
  '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: 'var(--ed-primary-soft)', color: 'var(--ed-text)' },
  '.cm-panels': { backgroundColor: 'var(--ed-band)', color: 'var(--ed-text)' },
}, { dark: true });

const syntax = HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.operatorKeyword, t.controlKeyword, t.definitionKeyword], color: 'var(--ed-code-keyword)' },
  { tag: [t.string, t.special(t.string), t.regexp, t.escape], color: 'var(--ed-code-string)' },
  { tag: [t.number, t.bool, t.null, t.atom, t.literal], color: 'var(--ed-code-number)' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: 'var(--ed-code-comment)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.variableName), t.labelName], color: 'var(--ed-code-name)' },
  { tag: [t.typeName, t.className, t.namespace, t.tagName, t.attributeName, t.annotation], color: 'var(--ed-code-type)' },
  { tag: [t.propertyName, t.variableName, t.name], color: 'var(--ed-text)' },
  { tag: [t.punctuation, t.separator, t.bracket, t.operator], color: 'var(--ed-code-punct)' },
  { tag: t.heading, fontWeight: 'bold', color: 'var(--ed-primary-hover)' },
  { tag: t.link, color: 'var(--ed-link)', textDecoration: 'underline' },
  { tag: t.invalid, color: 'var(--ed-danger-hover)' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
]);

export const arcadeCodeMirror = [Prec.highest(chrome), Prec.highest(syntaxHighlighting(syntax))];
