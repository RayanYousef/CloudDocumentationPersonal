---
title: Sync Model
description: Explains the host-authoritative replication model, what state is replicated at which rate, and how client intents become confirmed changes.
type: system
tags: [networking, replication, authority]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Net
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Net/ReplicationService.cs
sidebar_position: 1
---

## Authority

One player hosts; the host simulation is the truth. Clients never apply a gameplay mutation locally except for cosmetic prediction (their own airship's movement). Everything else, including [Inventory](../inventory.md) changes and damage, is sent as an intent and applied only when the host's confirmed delta arrives.

## Replication tiers

State is grouped into three tiers with different send rates: **hot** (airship transforms, projectiles) at 30 Hz as delta-compressed snapshots; **warm** (health, heat, crew positions) at 10 Hz; and **cold** (inventory, recipes, world state) event-driven, sent only on change. Each tier has its own reliable or unreliable channel, and the tier of a field is declared with a `[Replicate(Tier.Warm)]` attribute that `ReplicationService` scans at startup.

## Intents and deltas

An intent is a small struct with a client tick number. The host validates it, applies it, and broadcasts a delta stamped with the same tick. Clients keep a ring buffer of unconfirmed intents and drop them as confirmations arrive. Intents that arrive late are handled by [Lag Compensation](lag-compensation.md) rather than being rejected outright.
