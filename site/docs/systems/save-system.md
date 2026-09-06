---
title: Save System
description: Covers how game state is serialised to disk, the save slot layout, and how older save files are migrated when the schema changes.
type: system
tags: [save, persistence, serialization, migration]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Persistence
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Persistence/SaveService.cs
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Persistence/Migrations
sidebar_position: 3
---

## What gets saved

A save is a snapshot of every `ISaveable` service: the [Inventory](inventory.md) containers, airship hull state, forge recipes unlocked, and the world seed. Transient combat state is never saved; a game loaded mid-fight resumes at the last safe harbour. Each service writes its own section under a stable key so sections can evolve independently.

## Slot layout

Saves live under the Unity persistent data path in a `saves/` folder. Each slot is a folder with `meta.json` (name, playtime, schema version, thumbnail) and `state.json.gz`, the gzipped body. The format is JSON rather than a binary blob; the reasoning is recorded in [Save Format: JSON over Binary](../decisions/2026-09-save-format-json.md). Writes go to a temp file that is renamed over the old one, so a crash mid-save cannot corrupt the slot.

## Migrations

`meta.json` carries `schemaVersion`. On load, `SaveService` runs every migration in `Migrations/` with a version greater than the file's, in order, on the parsed JSON tree before any service deserialises it. Migrations are small, forward-only and must be idempotent. Adding a field with a default needs no migration; renaming or restructuring does.
