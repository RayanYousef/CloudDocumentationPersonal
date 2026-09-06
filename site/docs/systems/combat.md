---
title: Combat
description: Describes the damage pipeline, hit resolution and critical rolls used whenever an airship, turret or crew member takes damage.
type: system
tags: [combat, damage, gameplay]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Combat
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Combat/DamagePipeline.cs
sidebar_position: 2
---

## Damage pipeline

Every hit becomes a `DamageEvent` carrying source, target, base amount and a damage type (kinetic, fire, lightning). The event passes through an ordered list of `IDamageModifier` stages: armour, resistances, the crit roll, and finally clamping. Stages are registered by the target's components at spawn time, so a turret with a heat shield simply adds a fire-resistance modifier rather than the pipeline knowing about shields.

## Critical hits

After the August rework, crits are rolled once per event with a chance of `5% + 0.5% * attacker.Precision`, capped at 40%. A crit multiplies the post-armour amount by 1.75. Rolls use the deterministic combat RNG seeded from the match seed so the host and clients agree; see [Lag Compensation](networking/lag-compensation.md) for how late hits are validated.

## Status effects

Burn, shock and freeze are applied by the final pipeline stage and ticked by the status system. Their durations and stacking rules are documented in the Status Effects notes, which are not yet part of this bundle.

## Interaction with inventory

Destroying a container drops its contents as loot stacks. The drop logic calls `InventoryService.TryRemove` for every slot rather than clearing the array, so [Inventory](inventory.md) change events fire normally and the save system sees a consistent state.
