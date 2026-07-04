---
type: Reference
title: Markdown Basics
sidebar_position: 1
description: A reference demonstrating the Markdown features supported on this site - text formatting, ordered and unordered lists, syntax-highlighted fenced code blocks, and admonition callouts.
tags: [markdown, admonitions, code-blocks, syntax-highlighting, authoring]
resource: website/docs/examples/markdown-basics.md
timestamp: '2026-07-04T00:00:00+00:00'
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

## Related

* [Editing this site](../guide/editing.md) — how to add and edit pages using these Markdown features.
* [OKF authoring](../guide/okf-authoring.md) — conventions for structured, machine-readable docs.
