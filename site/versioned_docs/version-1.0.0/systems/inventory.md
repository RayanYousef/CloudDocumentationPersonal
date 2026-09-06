---
title: Inventory
description: Explains how items are stacked, stored and moved between containers, and which service API you call to change a player's inventory.
type: system
tags: [inventory, items, gameplay, service]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/9c52fd7232043d5eb3e24cb7ef5e53acc4c4b9b7/examples/unity-project/Assets/Scripts/Inventory
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/9c52fd7232043d5eb3e24cb7ef5e53acc4c4b9b7/examples/unity-project/Assets/Scripts/Inventory/InventoryService.cs
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/9c52fd7232043d5eb3e24cb7ef5e53acc4c4b9b7/examples/unity-project/Assets/Scripts/Inventory/ItemStack.cs
sidebar_position: 1
---

## Model

An inventory is a fixed-size array of `ItemStack` slots owned by a container: a crew member, an airship hold or a forge input tray. An `ItemStack` is a value type holding an `ItemId` and a count. Stacks of the same id merge up to the item's `MaxStack` (64 for ore, 1 for tools). Empty slots are represented by `ItemStack.Empty` rather than null so the array can be serialised without special cases.

## Service API

All mutations go through `InventoryService`. The three calls you will use are `TryAdd(containerId, stack)`, `TryRemove(containerId, itemId, count)` and `Move(from, fromSlot, to, toSlot)`. Each returns a result struct instead of throwing, because failed adds are normal gameplay outcomes. The service raises `InventoryChanged` with the affected container id, which the HUD and the Save System subscribe to.

## Constraints

Inventories are authoritative on the host. Clients send intents and receive the resulting delta through the Sync Model. Note that in 1.0.0 stacks did not yet carry a quality seed; that field was added on `main` after the freeze, which is exactly the kind of drift a pinned `resource` protects you from.
