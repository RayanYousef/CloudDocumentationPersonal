---
title: Markdown Basics
sidebar_position: 1
description: A short demonstration of standard Markdown features supported by this site.
---

# Markdown Basics

This page demonstrates some of the standard Markdown elements you can use when authoring documentation.

## Text formatting

You can make text **bold**, _italic_, or `inline code`. Combine them as needed.

## Lists

Unordered list:

- First item
- Second item
- Third item

Ordered list:

1. Step one
2. Step two
3. Step three

## Code blocks

Use fenced code blocks with a language identifier for syntax highlighting:

```javascript
function greet(name) {
  return `Hello, ${name}!`;
}

console.log(greet('world'));
```

## Admonitions

Docusaurus supports admonition blocks for callouts:

:::tip Pro tip

Keep your pages focused on a single topic. Use the sidebar hierarchy to group related pages into categories.

:::

:::note

Standard Markdown is supported everywhere. Pages that need React components (like 3D viewers) must use the `.mdx` extension.

:::
