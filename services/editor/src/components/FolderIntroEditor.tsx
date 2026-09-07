import { useState } from 'react';
import { splitFolderIntro, replaceFolderIntro } from '../mdx/folderIntro.js';

/** Edits only the hand-written part of an index.md; the generated block is shown read-only. */
export function FolderIntroEditor({ text, onSave, onDirty, readOnly }: { text: string; onSave(next: string): Promise<void>; onDirty?(): void; readOnly: boolean }) {
  const parts = splitFolderIntro(text);
  const [before, setBefore] = useState(parts.before);
  return (
    <div>
      <h3>Folder intro (frontmatter + intro paragraph)</h3>
      <textarea aria-label="Folder intro" rows={10} value={before} readOnly={readOnly} onChange={(e) => { setBefore(e.target.value); onDirty?.(); }} />
      <h3>Generated block (read-only)</h3>
      <pre style={{ opacity: 0.7 }}>{parts.generated}</pre>
      <button className="btn" disabled={readOnly || before === parts.before} onClick={() => onSave(replaceFolderIntro(text, before))}>Save intro</button>
    </div>
  );
}
