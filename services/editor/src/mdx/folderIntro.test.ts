import { describe, it, expect } from 'vitest';
import { splitFolderIntro, replaceFolderIntro } from './folderIntro.js';

const index = '---\ntitle: Systems\n---\n\nIntro paragraph.\n\n<!-- okf:index -->\n## Pages\n* [A](a.md) - a.\n<!-- /okf:index -->\n';

describe('folder intro editing', () => {
  it('splits text before, inside and after the generated block', () => {
    const p = splitFolderIntro(index);
    expect(p.before).toBe('---\ntitle: Systems\n---\n\nIntro paragraph.\n\n');
    expect(p.generated).toBe('<!-- okf:index -->\n## Pages\n* [A](a.md) - a.\n<!-- /okf:index -->');
    expect(p.after).toBe('\n');
  });
  it('replaces only the text before the block', () => {
    const out = replaceFolderIntro(index, '---\ntitle: Systems\n---\n\nNew intro.\n\n');
    expect(out).toBe('---\ntitle: Systems\n---\n\nNew intro.\n\n<!-- okf:index -->\n## Pages\n* [A](a.md) - a.\n<!-- /okf:index -->\n');
  });
});
