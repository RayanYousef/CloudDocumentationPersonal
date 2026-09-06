---
title: ECS vs MonoBehaviour
description: Records why the gameplay layer stays on plain C# services plus MonoBehaviour views for 1.0 instead of migrating to Unity ECS.
type: decision
tags: [architecture, ecs, decision, performance]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Bootstrap.cs
sidebar_position: 1
---

## Context

In July 2026 a spike measured the cost of moving projectiles and crew AI to Unity's Entities package. The motivation was frame time on the Android target when four airships trade fire, where the profiler showed 6 ms of MonoBehaviour update overhead.

## Options

1. **Full ECS**: rewrite gameplay on Entities, keep presentation as hybrid.
2. **Hybrid**: ECS for projectiles only, everything else unchanged.
3. **Stay**: plain C# service classes (see [Systems](../systems/)) with thin MonoBehaviour views, and fix the hot spots by hand.

## Decision

Option 3 for 1.0. The spike recovered most of the 6 ms by moving projectile stepping into a single `ProjectileService.Tick` loop over a struct array, which is the same data-oriented idea without the Entities dependency. The team has no ECS experience, and the [Sync Model](../systems/networking/sync-model.md) relies on attribute scanning of ordinary classes that would need a rewrite.

## Consequences

Projectile-heavy scenes stay within budget, but crew AI remains per-object and will be the next bottleneck. Revisit after 1.0 if crew counts grow beyond twelve per airship.
