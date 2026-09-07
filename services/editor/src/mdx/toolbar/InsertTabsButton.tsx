import { ButtonWithTooltip, usePublisher, insertJsx$ } from '@mdxeditor/editor';

export function InsertTabsButton() {
  const insertJsx = usePublisher(insertJsx$);
  const insert = () => insertJsx({
    name: 'Tabs', kind: 'flow', props: {},
    children: [
      { type: 'mdxJsxFlowElement', name: 'TabItem', attributes: [{ type: 'mdxJsxAttribute', name: 'value', value: 'one' }, { type: 'mdxJsxAttribute', name: 'label', value: 'One' }, { type: 'mdxJsxAttribute', name: 'default', value: null }], children: [{ type: 'paragraph', children: [{ type: 'text', value: 'First tab' }] }] },
      { type: 'mdxJsxFlowElement', name: 'TabItem', attributes: [{ type: 'mdxJsxAttribute', name: 'value', value: 'two' }, { type: 'mdxJsxAttribute', name: 'label', value: 'Two' }], children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Second tab' }] }] },
    ],
  });
  return <ButtonWithTooltip title="Insert tabs" onClick={insert}><span style={{ fontWeight: 700, fontSize: 12 }}>TABS</span></ButtonWithTooltip>;
}
