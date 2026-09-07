import MDXComponents from '@theme-original/MDXComponents';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import ModelViewer from '@site/src/components/ModelViewer';
import FbxViewer from '@site/src/components/FbxViewer';

// Registered globally so pages use <ModelViewer /> etc. without import lines
// (the editor's JSX descriptors rely on this: they emit no imports).
export default { ...MDXComponents, Tabs, TabItem, ModelViewer, FbxViewer };
