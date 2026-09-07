import { useState } from 'react';
import { splitFolderIntro, replaceFolderIntro } from '../mdx/folderIntro.js';

/** Edits only the hand-written part of an index.md; the generated block is shown read-only. */
export function FolderIntroEditor({ text, onSave, readOnly }: { text: string; onSave(next: string): Promise<void>; readOnly: boolean }) {
  const parts = splitFolderIntro(text);
  const [before, setBefore] = useState(parts.before);
  return (
    <div>
      <h3>Folder intro (frontmatter + intro paragraph)</h3>
      <textarea rows={10} value={before} readOnly={readOnly} onChange={(e) => setBefore(e.target.value)} />
      <h3>Generated block (read-only)</h3>
      <pre style={{ opacity: 0.7 }}>{parts.generated}</pre>
      <button className="btn" disabled={readOnly || before === parts.before} onClick={() => onSave(replaceFolderIntro(text, before))}>Save intro</button>
    </div>
  );
}
