/**
 * Toolbar button: Insert Tabs.
 *
 * Inserts a <Tabs> container with two <TabItem> children (the first marked
 * `default`), each holding a placeholder paragraph. Lives ONLY inside the
 * MDXEditor toolbar (mounted from editorClient.js, itself reachable only through
 * the BrowserOnly editor subtree), so @mdxeditor imports are SSR-safe here.
 *
 * Insertion goes through insertJsx$ so the jsxPlugin descriptors for Tabs /
 * TabItem (jsxDescriptors.jsx) apply — giving the nested rich-text editors and
 * the auto-imports of @theme/Tabs and @theme/TabItem for a clean round-trip.
 *
 * The TabItem children are supplied as raw mdast nodes so they nest correctly
 * inside the Tabs flow element.
 */
import React from 'react';
import {ButtonWithTooltip, usePublisher, insertJsx$} from '@mdxeditor/editor';

// A simple two-pane icon so the button reads as "tabs".
function TabsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 6V4M14 6V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Build a TabItem mdast flow element with value/label, optional default, and a placeholder paragraph. */
function makeTabItem({value, label, isDefault, placeholder}) {
  const attributes = [
    {type: 'mdxJsxAttribute', name: 'value', value},
    {type: 'mdxJsxAttribute', name: 'label', value: label},
  ];
  if (isDefault) {
    // Boolean shorthand attribute: <TabItem ... default>
    attributes.push({type: 'mdxJsxAttribute', name: 'default', value: null});
  }
  return {
    type: 'mdxJsxFlowElement',
    name: 'TabItem',
    attributes,
    children: [
      {type: 'paragraph', children: [{type: 'text', value: placeholder}]},
    ],
  };
}

export default function InsertTabsButton() {
  const insertJsx = usePublisher(insertJsx$);

  const onClick = () => {
    insertJsx({
      name: 'Tabs',
      kind: 'flow',
      props: {},
      children: [
        makeTabItem({
          value: 'tab1',
          label: 'Tab 1',
          isDefault: true,
          placeholder: 'First tab content.',
        }),
        makeTabItem({
          value: 'tab2',
          label: 'Tab 2',
          isDefault: false,
          placeholder: 'Second tab content.',
        }),
      ],
    });
  };

  return (
    <ButtonWithTooltip title="Insert tabs" onClick={onClick}>
      <TabsIcon />
    </ButtonWithTooltip>
  );
}
