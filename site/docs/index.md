---
title: Skyforge Documentation
sidebar_position: 1
okf_version: "0.2"
---

Skyforge is a cooperative airship-crafting game built in Unity 6. This bundle documents its runtime systems, art assets and the design decisions behind them; every page points at the code or asset folder it describes.

Start with [Getting Started](getting-started.md) if you are new to the project. The [Platform](platform/) folder documents the documentation platform itself (packages, services, extension guides, roadmap) for anyone changing the site rather than the game docs.

<!-- okf:index -->
## Pages
* [Getting Started](getting-started.md) - Read this first if you need to clone, open and run the Skyforge Unity project locally for the first time.

## Folders
* [Systems](systems/) - Runtime systems that make up the Skyforge gameplay layer: how state is stored, how fights resolve, and how the crew's airships stay in sync across the network.
* [Assets](assets/) - Art and content assets that ship in the game: what each model set contains, its polygon and texture budgets, and where the source files live in the repo.
* [Decisions](decisions/) - Architecture decision records for choices that were debated and settled. Each record states the context, the options considered, what was chosen and what it costs; read one before reopening its topic.
* [Platform](platform/) - How the documentation platform itself is built: the packages and services behind this site, the contracts they implement, the rules that keep them apart, and the steps for adding a new auth provider, content backend, service, viewer or deploy target. Read this folder when you are changing the platform rather than writing project documentation; every page pins the code it describes so agents can jump from a page into the source.
<!-- /okf:index -->
