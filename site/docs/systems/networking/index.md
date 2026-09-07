---
title: Networking
sidebar_position: 4
---

How Skyforge keeps up to four crews in sync: the authority model, what is replicated, and how the host reconciles late input from high-latency clients.

<!-- okf:index -->
## Pages
* [Sync Model](sync-model.md) - Explains the host-authoritative replication model, what state is replicated at which rate, and how client intents become confirmed changes.
* [Lag Compensation](lag-compensation.md) - Reference for how the host rewinds hit checks for late client input, including the rewind cap and the tunables exposed to designers.
<!-- /okf:index -->
