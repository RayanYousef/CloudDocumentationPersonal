---
title: Authoring Content
sidebar_position: 1
description: How to add versions, features, code-file tabs, and 3D models.
---

# Authoring Content

The sidebar is **auto-generated** from the folder structure under `website/docs/`.
Folder = sidebar category, file = page.

## Add a feature

1. Create a folder under `docs/features/` (e.g. `docs/features/inventory/`).
2. Add `_category_.json` to label/order it:

   ```json
   { "label": "Inventory", "position": 2, "collapsed": false }
   ```

3. Add code-file pages inside it.

## Add a code-file page with tabs

Create an `.mdx` file and use the shared tab set (**API Documentation**,
**How To Use**, **Dependencies**, **User Story**). The `groupId="codedoc"` keeps
the reader's chosen tab selected as they move between files.

````mdx
---
title: MyFile.cs
---
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="codedoc">
  <TabItem value="api" label="API Documentation" default>…</TabItem>
  <TabItem value="howto" label="How To Use">…</TabItem>
  <TabItem value="deps" label="Dependencies">…</TabItem>
  <TabItem value="story" label="User Story">…</TabItem>
</Tabs>
````

## Add a 3D model

See [3D Models](../models/). Export glTF/GLB, drop it in
`website/static/models/`, and embed `<ModelViewer src="/models/file.glb" />`.

## Cut a new version

Snapshot the current docs as a released version:

```bash
cd website
npm run docusaurus docs:version 2.0.0
```

This copies `docs/` into `versioned_docs/version-2.0.0/` and adds it to the
navbar version dropdown. `docs/` itself remains the in-progress **Next** version.
