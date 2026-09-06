---
title: Lag Compensation
description: Reference for how the host rewinds hit checks for late client input, including the rewind cap and the tunables exposed to designers.
type: reference
tags: [networking, latency, combat, tuning]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Net/LagCompensator.cs
sidebar_position: 2
---

## Why it exists

A client fires a cannon at what it sees, but by the time the intent reaches the host the target has moved. Without compensation, shots that looked clean on the client would miss on the host and players would learn to lead targets by their ping, which is miserable. The compensator lets the host judge the shot against the world as the client saw it.

## How it works

The host keeps a 250 ms history of hot-tier transforms (see [Sync Model](sync-model.md)). When a fire intent arrives with client tick `t`, the host rewinds the relevant colliders to the snapshot nearest `t`, runs the hit test through the normal [Combat](../combat.md) pipeline, and restores the current state. The rewind is capped at 250 ms as of build 0.9.3; intents older than that are resolved against the present.

## Tunables

| Key | Default | Notes |
|---|---|---|
| `net.rewindCapMs` | 250 | Hard cap on rewind distance. |
| `net.historyHz` | 30 | Snapshot rate for the history ring. |
| `net.rewindHitscanOnly` | true | Projectiles are simulated, not rewound. |

These live in `NetConfig.asset` and can be changed in the editor without a code change.
