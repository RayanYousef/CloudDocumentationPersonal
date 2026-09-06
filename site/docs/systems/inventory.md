---
title: Inventory
description: Explains how items are stacked, stored and moved between containers, and which service API you call to change a player's inventory.
type: system
tags: [inventory, items, gameplay, service]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Inventory
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Inventory/InventoryService.cs
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Inventory/ItemStack.cs
sidebar_position: 1
---

## Model

An inventory is a fixed-size array of `ItemStack` slots owned by a container: a crew member, an airship hold or a forge input tray. An `ItemStack` is a value type holding an `ItemId`, a count and an optional 32-bit quality seed. Stacks of the same id merge up to the item's `MaxStack` (64 for ore, 1 for tools). Empty slots are represented by `ItemStack.Empty` rather than null so the array can be serialised without special cases.

## Service API

All mutations go through `InventoryService`. The three calls you will use are `TryAdd(containerId, stack)`, `TryRemove(containerId, itemId, count)` and `Move(from, fromSlot, to, toSlot)`. Each returns a result struct instead of throwing, because failed adds (hold full, item locked by a recipe) are normal gameplay outcomes. The service raises `InventoryChanged` with the affected container id, which the HUD and the [Save System](save-system.md) subscribe to.

## Constraints

Inventories are authoritative on the host. Clients send intents and receive the resulting delta through the [Sync Model](networking/sync-model.md); the service never mutates local state on a client without a host acknowledgement. Item definitions themselves are ScriptableObjects under `Assets/Data/Items` and are not covered here.
