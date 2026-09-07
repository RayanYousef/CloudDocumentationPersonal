import { START_MARKER, END_MARKER } from '@platform/okf-core';

export function splitFolderIntro(indexText: string): { before: string; generated: string; after: string } {
  const s = indexText.indexOf(START_MARKER);
  const e = indexText.indexOf(END_MARKER);
  if (s < 0 || e < 0) return { before: indexText, generated: '', after: '' };
  return { before: indexText.slice(0, s), generated: indexText.slice(s, e + END_MARKER.length), after: indexText.slice(e + END_MARKER.length) };
}

export function replaceFolderIntro(indexText: string, before: string): string {
  const p = splitFolderIntro(indexText);
  return before + p.generated + p.after;
}
