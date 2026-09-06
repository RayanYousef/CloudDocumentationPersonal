export interface ComponentProp { name: string; type: 'string' | 'number' | 'boolean' }
export interface ComponentDescriptor {
  name: string;
  kind: 'flow';
  hasChildren: boolean;
  preview: 'model-viewer' | 'fbx-viewer' | 'tabs' | 'tab-item' | 'generic';
  props: ComponentProp[];
}
export interface ComponentsManifest { components: ComponentDescriptor[] }
