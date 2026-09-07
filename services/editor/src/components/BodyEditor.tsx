import { useMemo, type Ref } from 'react';
import {
  MDXEditor, headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin, markdownShortcutPlugin, linkPlugin, linkDialogPlugin, imagePlugin, tablePlugin,
  codeBlockPlugin, codeMirrorPlugin, directivesPlugin, AdmonitionDirectiveDescriptor, jsxPlugin, toolbarPlugin, UndoRedo, BoldItalicUnderlineToggles, BlockTypeSelect,
  CreateLink, InsertImage, InsertTable, InsertThematicBreak, ListsToggle, InsertCodeBlock, InsertAdmonition, ConditionalContents, ChangeCodeMirrorLanguage, Separator,
  type MDXEditorMethods,
} from '@mdxeditor/editor';
import type { ComponentsManifest } from '@platform/contracts';
import { toJsxDescriptors } from '../mdx/componentsManifest.js';
import { previews } from '../mdx/descriptors.js';
import { InsertModelButton } from '../mdx/toolbar/InsertModelButton.js';
import { InsertImageButton } from '../mdx/toolbar/InsertImageButton.js';
import { InsertFromRepoButton } from '../mdx/toolbar/InsertFromRepoButton.js';
import { InsertTabsButton } from '../mdx/toolbar/InsertTabsButton.js';

const CODE_LANGUAGES = { csharp: 'C#', yaml: 'YAML', bash: 'Bash', json: 'JSON', text: 'Plain text' };

export function BodyEditor({ markdown, editorRef, fileLabel, components, readOnly, onError, onChange }: { markdown: string; editorRef: Ref<MDXEditorMethods>; fileLabel: string; components: ComponentsManifest; readOnly: boolean; onError(e: { error: string; source: string }): void; onChange?(markdown: string, initialMarkdownNormalize: boolean): void }) {
  const descriptors = useMemo(() => toJsxDescriptors(components, previews), [components]);
  return (
    <MDXEditor
      ref={editorRef}
      className="dark-theme dark-editor"
      markdown={markdown}
      readOnly={readOnly}
      onError={onError}
      onChange={onChange}
      contentEditableClassName="mdxeditor-docs-body"
      plugins={[
        headingsPlugin(), listsPlugin(), quotePlugin(), thematicBreakPlugin(), linkPlugin(), linkDialogPlugin(), imagePlugin(), tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: 'text' }), codeMirrorPlugin({ codeBlockLanguages: CODE_LANGUAGES }),
        directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
        jsxPlugin({ jsxComponentDescriptors: descriptors }),
        markdownShortcutPlugin(),
        toolbarPlugin({ toolbarContents: () => (<>
          <UndoRedo /><Separator /><BoldItalicUnderlineToggles /><Separator /><BlockTypeSelect /><Separator /><ListsToggle /><Separator />
          <CreateLink /><InsertImage /><InsertImageButton fileLabel={fileLabel} /><InsertModelButton fileLabel={fileLabel} /><InsertFromRepoButton /><InsertTabsButton /><Separator />
          <InsertTable /><InsertThematicBreak /><Separator /><InsertCodeBlock /><InsertAdmonition /><Separator />
          <ConditionalContents options={[{ when: (editor) => editor?.editorType === 'codeblock', contents: () => <ChangeCodeMirrorLanguage /> }]} />
        </>) }),
      ]}
    />
  );
}
