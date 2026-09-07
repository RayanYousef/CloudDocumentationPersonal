---
title: "Save Format: JSON over Binary"
description: Records the choice of gzipped JSON for save files instead of a custom binary format, and the size and compatibility trade-offs accepted.
type: decision
tags: [save, serialization, decision, format]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Persistence/SaveService.cs
sidebar_position: 2
---

## Context

The [Save System](../systems/save-system.md) originally wrote a hand-rolled binary format. Two schema changes in August each cost a day of debugging corrupted test saves, and support had no way to inspect a player's file.

## Options

1. **Keep binary**, add a version header and a converter tool.
2. **MessagePack** via a third-party package.
3. **JSON**, gzipped on disk, with schema migrations run on the parsed tree.

## Decision

Option 3. A typical late-game save is 1.4 MB as JSON and 210 KB gzipped, well under the 2 MB cloud-sync limit. Load time rose from 40 ms to 95 ms, which is invisible behind the harbour transition. Files are human-readable after `gunzip`, which is what support and QA actually asked for, and migrations become plain tree edits instead of byte-offset surgery.

## Consequences

Floating-point values round-trip through text, so anything requiring bit-exact restore (the world seed, item quality seeds) is stored as an integer or hex string. The [Inventory](../systems/inventory.md) serialiser was updated accordingly.
