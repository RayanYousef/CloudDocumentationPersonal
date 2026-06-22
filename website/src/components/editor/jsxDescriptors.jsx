import React from 'react';
import {NestedLexicalEditor, useMdastNodeUpdater} from '@mdxeditor/editor';
import ModelViewer from '@site/src/components/ModelViewer';
import FbxViewer from '@site/src/components/FbxViewer';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

/**
 * Custom JSX component descriptors for MDXEditor's jsxPlugin.
 *
 * These teach the editor how to (a) recognize the custom MDX components used in
 * the docs, (b) re-serialize them back to identical MDX on save, and (c) render
 * a meaningful in-editor surface (a small props form for the leaf viewers, and
 * a nested rich-text editor for the container Tabs/TabItem).
 *
 * The `source` of each descriptor is the import specifier the jsxPlugin will
 * (re)emit at the top of the file, so it MUST match what the docs already use:
 *   - ModelViewer / FbxViewer: '@site/src/components/...'  (defaultExport)
 *   - Tabs / TabItem:          '@theme/Tabs' / '@theme/TabItem' (defaultExport)
 *
 * This module is only ever loaded inside the BrowserOnly subtree (via
 * editorClient.js), so the browser-only viewers are safe to import at top level.
 */

// --- mdast attribute helpers ----------------------------------------------

/** Read a string attribute value from an mdast JSX node's attributes. */
function readStringAttr(mdastNode, name) {
  const attr = (mdastNode.attributes || []).find(
    (a) => a.type === 'mdxJsxAttribute' && a.name === name,
  );
  if (!attr) return undefined;
  const v = attr.value;
  if (v == null) return undefined;
  // Plain string attribute: value is a string.
  if (typeof v === 'string') return v;
  // Expression attribute (e.g. height={480}): value is an mdxJsxAttributeValueExpression.
  if (typeof v === 'object' && 'value' in v) return v.value;
  return undefined;
}

/** Build a plain-string mdast attribute: name="value". */
function stringAttr(name, value) {
  return {type: 'mdxJsxAttribute', name, value: String(value)};
}

/** Build an expression mdast attribute: name={value} (raw JS expression text). */
function exprAttr(name, valueExpr) {
  return {
    type: 'mdxJsxAttribute',
    name,
    value: {
      type: 'mdxJsxAttributeValueExpression',
      value: String(valueExpr),
    },
  };
}

// --- shared editor UI for the leaf viewers --------------------------------

const fieldRowStyle = {display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem'};
const labelStyle = {
  width: 64,
  fontSize: '0.8rem',
  fontFamily: 'var(--ifm-font-family-monospace)',
};
const inputStyle = {
  flex: 1,
  padding: '0.3rem 0.45rem',
  border: '1px solid var(--ifm-color-emphasis-300)',
  borderRadius: 'var(--ifm-global-radius)',
};
const wrapStyle = {
  border: '1px dashed var(--ifm-color-emphasis-400)',
  borderRadius: 'var(--ifm-global-radius)',
  padding: '0.75rem',
  margin: '0.5rem 0',
};

/**
 * Shared editor for a leaf viewer component (ModelViewer / FbxViewer).
 * Shows an editable src/alt/height form plus the REAL component preview so the
 * author sees the actual rotating model. Persists attributes back to mdast via
 * useMdastNodeUpdater, re-emitting `height` as an expression ({480}) and
 * src/alt as plain string attributes for a clean round-trip.
 */
function ViewerEditor({mdastNode, label, Component}) {
  const updateMdastNode = useMdastNodeUpdater();

  const src = readStringAttr(mdastNode, 'src') || '';
  const alt = readStringAttr(mdastNode, 'alt') || '';
  const heightRaw = readStringAttr(mdastNode, 'height');
  const height = heightRaw != null && heightRaw !== '' ? Number(heightRaw) : 480;

  const commit = (next) => {
    const attributes = [];
    const nextSrc = 'src' in next ? next.src : src;
    const nextAlt = 'alt' in next ? next.alt : alt;
    const nextHeight = 'height' in next ? next.height : height;

    attributes.push(stringAttr('src', nextSrc));
    // Keep alt for round-trip even when empty would be unusual; emit when present.
    if (nextAlt !== '' && nextAlt != null) {
      attributes.push(stringAttr('alt', nextAlt));
    }
    if (nextHeight != null && !Number.isNaN(Number(nextHeight))) {
      attributes.push(exprAttr('height', Number(nextHeight)));
    }
    updateMdastNode({attributes});
  };

  return (
    <div style={wrapStyle} contentEditable={false}>
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--ifm-color-emphasis-700)',
          marginBottom: '0.5rem',
        }}
      >
        {label}
      </div>

      <div style={fieldRowStyle}>
        <span style={labelStyle}>src</span>
        <input
          style={inputStyle}
          value={src}
          placeholder="/models/sphere.gltf"
          onChange={(e) => commit({src: e.target.value})}
        />
      </div>
      <div style={fieldRowStyle}>
        <span style={labelStyle}>alt</span>
        <input
          style={inputStyle}
          value={alt}
          placeholder="Description"
          onChange={(e) => commit({alt: e.target.value})}
        />
      </div>
      <div style={fieldRowStyle}>
        <span style={labelStyle}>height</span>
        <input
          style={{...inputStyle, maxWidth: 120, flex: 'unset'}}
          type="number"
          value={height}
          onChange={(e) => commit({height: e.target.value})}
        />
      </div>

      {src ? (
        <div style={{marginTop: '0.5rem'}}>
          <Component src={src} alt={alt || undefined} height={height} />
        </div>
      ) : (
        <div
          style={{
            marginTop: '0.5rem',
            padding: '1rem',
            textAlign: 'center',
            color: 'var(--ifm-color-emphasis-600)',
          }}
        >
          Set a <code>src</code> to preview the model.
        </div>
      )}
    </div>
  );
}

// --- Tabs / TabItem editors ------------------------------------------------

const tabsWrapStyle = {
  border: '1px solid var(--ifm-color-emphasis-300)',
  borderRadius: 'var(--ifm-global-radius)',
  padding: '0.5rem 0.75rem',
  margin: '0.75rem 0',
};
const tabItemWrapStyle = {
  border: '1px solid var(--ifm-color-emphasis-200)',
  borderRadius: 'var(--ifm-global-radius)',
  padding: '0.5rem 0.75rem',
  margin: '0.5rem 0',
};

function TabsEditor({mdastNode}) {
  const groupId = readStringAttr(mdastNode, 'groupId');
  return (
    <div style={tabsWrapStyle}>
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--ifm-color-emphasis-700)',
          marginBottom: '0.4rem',
        }}
        contentEditable={false}
      >
        Tabs{groupId ? ` (groupId="${groupId}")` : ''}
      </div>
      {/* Children are TabItem JSX nodes — keep them as block-level flow content. */}
      <NestedLexicalEditor
        block
        getContent={(node) => node.children}
        getUpdatedMdastNode={(mdastNode2, children) => ({
          ...mdastNode2,
          children,
        })}
      />
    </div>
  );
}

function TabItemEditor({mdastNode}) {
  const updateMdastNode = useMdastNodeUpdater();
  const value = readStringAttr(mdastNode, 'value') || '';
  const label = readStringAttr(mdastNode, 'label') || '';
  const isDefault = (mdastNode.attributes || []).some(
    (a) => a.type === 'mdxJsxAttribute' && a.name === 'default',
  );

  const commit = (next) => {
    const nextValue = 'value' in next ? next.value : value;
    const nextLabel = 'label' in next ? next.label : label;
    const nextDefault = 'default' in next ? next.default : isDefault;

    const attributes = [];
    attributes.push(stringAttr('value', nextValue));
    attributes.push(stringAttr('label', nextLabel));
    if (nextDefault) {
      // Boolean shorthand attribute: <TabItem ... default>
      attributes.push({type: 'mdxJsxAttribute', name: 'default', value: null});
    }
    updateMdastNode({attributes});
  };

  return (
    <div style={tabItemWrapStyle}>
      <div style={{...fieldRowStyle, flexWrap: 'wrap'}} contentEditable={false}>
        <span style={labelStyle}>value</span>
        <input
          style={{...inputStyle, maxWidth: 160}}
          value={value}
          onChange={(e) => commit({value: e.target.value})}
        />
        <span style={labelStyle}>label</span>
        <input
          style={{...inputStyle, maxWidth: 200}}
          value={label}
          onChange={(e) => commit({label: e.target.value})}
        />
        <label style={{fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem'}}>
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => commit({default: e.target.checked})}
          />
          default
        </label>
      </div>
      <NestedLexicalEditor
        block
        getContent={(node) => node.children}
        getUpdatedMdastNode={(mdastNode2, children) => ({
          ...mdastNode2,
          children,
        })}
      />
    </div>
  );
}

// --- descriptor list -------------------------------------------------------

export const jsxComponentDescriptors = [
  {
    name: 'ModelViewer',
    kind: 'flow',
    source: '@site/src/components/ModelViewer',
    defaultExport: true,
    props: [
      {name: 'src', type: 'string'},
      {name: 'alt', type: 'string'},
      {name: 'height', type: 'number'},
    ],
    hasChildren: false,
    Editor: (props) => (
      <ViewerEditor {...props} label="ModelViewer" Component={ModelViewer} />
    ),
  },
  {
    name: 'FbxViewer',
    kind: 'flow',
    source: '@site/src/components/FbxViewer',
    defaultExport: true,
    props: [
      {name: 'src', type: 'string'},
      {name: 'alt', type: 'string'},
      {name: 'height', type: 'number'},
    ],
    hasChildren: false,
    Editor: (props) => (
      <ViewerEditor {...props} label="FbxViewer" Component={FbxViewer} />
    ),
  },
  {
    name: 'Tabs',
    kind: 'flow',
    source: '@theme/Tabs',
    defaultExport: true,
    props: [{name: 'groupId', type: 'string'}],
    hasChildren: true,
    Editor: TabsEditor,
  },
  {
    name: 'TabItem',
    kind: 'flow',
    source: '@theme/TabItem',
    defaultExport: true,
    props: [
      {name: 'value', type: 'string'},
      {name: 'label', type: 'string'},
      {name: 'default', type: 'string'},
    ],
    hasChildren: true,
    Editor: TabItemEditor,
  },
];
