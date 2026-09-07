---
title: Systems
sidebar_position: 3
---

Runtime systems that make up the Skyforge gameplay layer: how state is stored, how fights resolve, and how the crew's airships stay in sync across the network.

Each page links to the service that implements it; the services are plain C# classes registered in `Bootstrap.cs`, not MonoBehaviours.

<!-- okf:index -->
## Pages
* [Inventory](inventory.md) - Explains how items are stacked, stored and moved between containers, and which service API you call to change a player's inventory.
* [Combat](combat.md) - Describes the damage pipeline, hit resolution and critical rolls used whenever an airship, turret or crew member takes damage.
* [Save System](save-system.md) - Covers how game state is serialised to disk, the save slot layout, and how older save files are migrated when the schema changes.

## Folders
* [Networking](networking/) - How Skyforge keeps up to four crews in sync: the authority model, what is replicated, and how the host reconciles late input from high-latency clients.
<!-- /okf:index -->
