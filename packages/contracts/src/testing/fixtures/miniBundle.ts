import type { CodeRepoRef } from '../../platform-config.js';

export const MINI_CODE_REPOS: CodeRepoRef[] = [
  { owner: 'acme', repo: 'game', defaultRef: 'main', label: 'Game', pathPrefix: '' },
];

const blob = (p: string) => `https://github.com/acme/game/blob/main/${p}`;

/** A complete, valid OKF Core bundle: root index, one folder, two pages, log, AGENTS.md. */
export const MINI_BUNDLE: Record<string, string> = {
  'index.md': `---
title: Mini Docs
sidebar_position: 1
okf_version: "0.2"
---

A tiny bundle used by tests. It documents one gameplay system and one guide.

<!-- okf:index -->
## Pages
* [Getting Started](getting-started.md) - Read this first to build and run the game locally.

## Folders
* [Systems](systems/) - Runtime systems of the game.
<!-- /okf:index -->
`,
  'getting-started.md': `---
title: Getting Started
description: Read this first to build and run the game locally.
type: guide
tags: [onboarding]
resource: ${blob('README.md')}
sidebar_position: 1
---

Clone the repo, open it in Unity, press Play. See [Inventory](systems/inventory.md).
`,
  'systems/index.md': `---
title: Systems
sidebar_position: 2
---

Runtime systems of the game.

<!-- okf:index -->
## Pages
* [Inventory](inventory.md) - Explains how items are stored and which service API changes a player's inventory.
<!-- /okf:index -->
`,
  'systems/inventory.md': `---
title: Inventory
description: Explains how items are stored and which service API changes a player's inventory.
type: system
tags: [inventory, gameplay]
resource: ${blob('Assets/Scripts/Inventory')}
sources:
  - resource: ${blob('Assets/Scripts/Inventory/InventoryService.cs')}
sidebar_position: 1
---

All mutations go through InventoryService.
`,
  'log.md': `---
title: Change Log
sidebar_position: 99
---

Newest first.

## 2026-08-01

* **Add**: [Inventory](/systems/inventory.md) - initial page. (by Test Author)
`,
  'AGENTS.md': `# How to navigate this bundle (for agents)

Start at index.md. Index blocks, manifest.json and code-maps/ are generated; never edit them.
`,
  'manifest.json': `[
  {
    "route": "/getting-started",
    "file": "getting-started.md",
    "title": "Getting Started",
    "description": "Read this first to build and run the game locally.",
    "type": "guide",
    "tags": [
      "onboarding"
    ],
    "resource": "${blob('README.md')}",
    "sources": []
  },
  {
    "route": "/systems/inventory",
    "file": "systems/inventory.md",
    "title": "Inventory",
    "description": "Explains how items are stored and which service API changes a player's inventory.",
    "type": "system",
    "tags": [
      "inventory",
      "gameplay"
    ],
    "resource": "${blob('Assets/Scripts/Inventory')}",
    "sources": [
      "${blob('Assets/Scripts/Inventory/InventoryService.cs')}"
    ]
  }
]
`,
  'code-maps/acme--game.md': `---
title: "Code map: acme/game"
sidebar_position: 98
---

<!-- okf:codemap -->
# Code map: acme/game

Generated from manifest.json. Each code path lists the pages that describe it; (source) marks a sources citation.

* \`Assets/Scripts/Inventory\` - [Inventory](/systems/inventory.md)
* \`Assets/Scripts/Inventory/InventoryService.cs\` - [Inventory](/systems/inventory.md) (source)
* \`README.md\` - [Getting Started](/getting-started.md)
<!-- /okf:codemap -->
`,
};

/** A valid new page for the mini bundle (used by write/create tests). */
export const NEW_PAGE_TEXT = `---
title: Combat
description: Describes the damage pipeline used whenever anything takes damage.
type: system
tags: [combat]
resource: ${blob('Assets/Scripts/Combat')}
sidebar_position: 2
---

Every hit becomes a DamageEvent.
`;

/** Missing "type" and "description": must be rejected with VALIDATION. */
export const INVALID_PAGE_TEXT = `---
title: Broken
resource: ${blob('Assets/Scripts/Broken')}
---

Body.
`;
