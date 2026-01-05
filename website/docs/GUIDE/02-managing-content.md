# Managing Content

This site is built using **Docusaurus**. The sidebar is **auto-generated**, making it easy to add content just by creating files and folders.

## 📂 Structure Overview

All documentation lives in the `website/docs` folder. The structure of the folders in your file explorer is exactly how it will appear on the website sidebar.

```text
website/docs/
├── getting-started/       (Folder = "Getting Started")
│   ├── intro.md
│   └── prerequisites.md
├── platforms/
│   ├── android/           (Folder = "Android")
│       └── index.md
│   ├── ios/               (Folder = "iOS")
│       ├── index.md
│       └── IOS_APNS...md
│   └── _category_.json
└── GUIDE/                 (Folder = "User Guide")
    ├── 01-using-the-site.md
    └── 02-managing-content.md
```

## 📝 Adding a New Page

1. Create a new markdown file (e.g., `my-new-page.md`) in any folder under `docs/`.
2. Add a **front matter** block at the top of the file:

```markdown
---
sidebar_position: 1
title: My New Page Title
description: A short description appearing in search results.
---

# My New Page Title

Write your content here using standard Markdown!
```

> The `sidebar_position` number controls the order of pages within that folder (1 appears first).

## 🗂️ Adding a New Section (Category)

To create a new collapsible section in the sidebar:

1. **Create a new folder** inside `docs/` (e.g., `docs/MyNewFeature/`).
2. **Add an index file** (Optional): Create `intro.md` inside it if you want an introduction page.
3. **Customize the Label**: By default, Docusaurus uses the folder name. To randomize the label or order, create a `_category_.json` file inside the new folder:

**File:** `docs/MyNewFeature/_category_.json`
```json
{
  "label": "✨ My New Feature",
  "position": 3,
  "collapsed": false
}
```

- **label**: What appears in the sidebar.
- **position**: Order relative to other folders/files at the same level.
- **collapsed**: Whether the menu is closed by default (`true`) or open (`false`).

## 🖼️ Adding Images

1. Place your image in `website/static/img/` (e.g., `website/static/img/screenshot.png`).
2. Reference it in markdown using the absolute path from the root:

```markdown
![Description of image](/img/screenshot.png)
```

## 🚀 Previewing Changes

To see your changes live:
1. Open a terminal in the `website` folder.
2. Run `npm run start` (or `npm run serve`).
3. Open `http://localhost:3000` in your browser.
