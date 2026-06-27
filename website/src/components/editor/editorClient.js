/**
 * Client-only MDXEditor wrapper.
 *
 * @mdxeditor/editor is strictly browser-only (it touches `window` at import
 * time). This module is therefore loaded ONLY from inside the BrowserOnly
 * subtree (EditorApp -> require here is reached only client-side), never by SSR.
 * The editor stylesheet is imported here too so it is never pulled into the
 * static build's server bundle.
 *
 * Exports a single <BodyEditor> that wraps MDXEditor with the full plugin set
 * required by the docs: headings, lists, quote, thematic break, markdown
 * shortcuts, links + link dialog, images, tables, code blocks with CodeMirror
 * (csharp/yaml/bash/json), admonition directives, and the custom JSX
 * descriptors (ModelViewer / FbxViewer / Tabs / TabItem). A formatting toolbar
 * is mounted at the top.
 *
 * NOTE: frontmatterPlugin is deliberately NOT enabled — frontmatter is managed
 * by the surrounding form in EditorApp, and the body handed to this editor has
 * already had its frontmatter stripped.
 */
import React from 'react';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  directivesPlugin,
  AdmonitionDirectiveDescriptor,
  jsxPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  InsertCodeBlock,
  InsertAdmonition,
  ConditionalContents,
  ChangeCodeMirrorLanguage,
  Separator,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import {jsxComponentDescriptors} from './jsxDescriptors';
import InsertModelButton from './InsertModelButton';
import InsertImageButton from './InsertImageButton';
import InsertFromRepoButton from './InsertFromRepoButton';
import InsertTabsButton from './InsertTabsButton';

const CODE_LANGUAGES = {
  csharp: 'C#',
  yaml: 'YAML',
  bash: 'Bash',
  json: 'JSON',
  text: 'Plain text',
};

/**
 * Build the toolbar render fn. Closes over `pat` (and an optional file label) so
 * the upload-and-insert buttons can commit binary assets to the repo.
 */
function makeToolbarContents({pat, fileLabel}) {
  return function toolbarContents() {
    return (
      <>
        <UndoRedo />
        <Separator />
        <BoldItalicUnderlineToggles />
        <Separator />
        <BlockTypeSelect />
        <Separator />
        <ListsToggle />
        <Separator />
        <CreateLink />
        <InsertImage />
        {/* Upload-and-commit image (writes to website/static/uploads/). */}
        <InsertImageButton pat={pat} fileLabel={fileLabel} />
        {/* Upload-and-commit 3D model (.glb/.gltf -> ModelViewer, .fbx -> FbxViewer). */}
        <InsertModelButton pat={pat} fileLabel={fileLabel} />
        {/* Reference an asset already committed to the repo (no re-upload). */}
        <InsertFromRepoButton pat={pat} />
        {/* Insert a <Tabs> block with two <TabItem> children (uses @theme/Tabs). */}
        <InsertTabsButton />
        <Separator />
        <InsertTable />
        <InsertThematicBreak />
        <Separator />
        <InsertCodeBlock />
        <InsertAdmonition />
        <Separator />
        {/* When inside a code block, swap the toolbar for a language selector. */}
        <ConditionalContents
          options={[
            {
              when: (editor) => editor?.editorType === 'codeblock',
              contents: () => <ChangeCodeMirrorLanguage />,
            },
          ]}
        />
      </>
    );
  };
}

/**
 * MDXEditor wrapper.
 *
 * @param {object} props
 * @param {string} props.markdown - initial body markdown (no frontmatter)
 * @param {(md: string) => void} [props.onChange]
 * @param {(payload: {error: string, source: string}) => void} [props.onError]
 * @param {import('react').Ref} [props.editorRef] - exposes getMarkdown/setMarkdown
 * @param {string} props.pat - GitHub PAT, used by the upload-and-insert buttons
 * @param {string} [props.fileLabel] - current file (for commit messages)
 */
export default function BodyEditor({markdown, onChange, onError, editorRef, pat, fileLabel, isDark}) {
  return (
    <MDXEditor
      ref={editorRef}
      className={isDark ? 'dark-theme dark-editor' : ''}
      markdown={markdown ?? ''}
      onChange={onChange}
      onError={onError}
      contentEditableClassName="mdxeditor-docs-body"
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        imagePlugin(),
        tablePlugin(),
        codeBlockPlugin({defaultCodeBlockLanguage: 'text'}),
        codeMirrorPlugin({codeBlockLanguages: CODE_LANGUAGES}),
        directivesPlugin({
          directiveDescriptors: [AdmonitionDirectiveDescriptor],
        }),
        jsxPlugin({jsxComponentDescriptors}),
        // markdownShortcutPlugin must come after the block plugins it depends on.
        markdownShortcutPlugin(),
        toolbarPlugin({toolbarContents: makeToolbarContents({pat, fileLabel})}),
      ]}
    />
  );
}
