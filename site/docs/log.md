---
title: Change Log
sidebar_position: 99
---

Newest first. Each entry names the page that changed and who changed it.

## 2026-09-07

* **Add**: [Architecture](/platform/architecture.md) - service map, composition, dependency rules and the login, save, publish and asset-fetch flows. (by Rayan Yousef)
* **Add**: [Contracts](/platform/contracts.md) - every interface, error code and contract suite in @platform/contracts. (by Rayan Yousef)
* **Add**: [OKF Core package](/platform/okf-core.md) - generator outputs, validator rules and the CLI entry. (by Rayan Yousef)
* **Add**: [Auth service](/platform/auth.md) - GitHub token provider, mock provider and session storage. (by Rayan Yousef)
* **Add**: [Content service](/platform/content.md) - backends, write and publish pipelines, asset fetch and search. (by Rayan Yousef)
* **Add**: [Editor service](/platform/editor.md) - composition, screens, build and known minor issues. (by Rayan Yousef)
* **Add**: [Viewers package](/platform/viewers.md) - rendering cores and the site wrappers. (by Rayan Yousef)
* **Add**: [Site](/platform/site.md) - Docusaurus configuration, prebuild artifacts, composition root and versioning. (by Rayan Yousef)
* **Add**: [Agent skill](/platform/agent-skill.md) - registry, navigation walk and rules of the docs-platform skill. (by Rayan Yousef)
* **Add**: [Workflows and scripts](/platform/workflows.md) - CI workflows and root npm scripts. (by Rayan Yousef)
* **Add**: [Add an auth provider](/platform/extending/add-auth-provider.md) - extension recipe for a new AuthProvider. (by Rayan Yousef)
* **Add**: [Add a content backend](/platform/extending/add-content-backend.md) - extension recipe for a new ContentBackend. (by Rayan Yousef)
* **Add**: [Add a new service module](/platform/extending/add-service-module.md) - extension recipe for a new workspace and lint element. (by Rayan Yousef)
* **Add**: [Add a site plugin or viewer component](/platform/extending/add-site-plugin-or-viewer.md) - extension recipe for MDX components and Docusaurus plugins. (by Rayan Yousef)
* **Add**: [Add a deploy target](/platform/extending/add-deploy-target.md) - extension recipe for a new hosting workflow. (by Rayan Yousef)
* **Add**: [Roadmap](/platform/roadmap.md) - Phase 2 items and the editor's known minor issues. (by Rayan Yousef)
* **Add**: [Platform decisions](/platform/decisions.md) - summary of spec section 7 plus two documentation decisions. (by Rayan Yousef)

## 2026-09-04

* **Update**: [Lag Compensation](/systems/networking/lag-compensation.md) - documented the 250 ms rewind cap introduced in build 0.9.3. (by Mira Okonkwo)
* **Add**: [Save Format: JSON over Binary](/decisions/2026-09-save-format-json.md) - recorded the decision to keep saves as gzipped JSON. (by Tomas Lindqvist)
* **Update**: [Save System](/systems/save-system.md) - added the migration section and the slot layout table. (by Tomas Lindqvist)

## 2026-08-21

* **Add**: [ECS vs MonoBehaviour](/decisions/2026-08-ecs-vs-monobehaviour.md) - captured why the gameplay layer stays on MonoBehaviour for 1.0. (by Mira Okonkwo)
* **Update**: [Combat](/systems/combat.md) - rewrote the damage pipeline section after the crit rework. (by Devi Raman)

## 2026-08-02

* **Add**: [Airship Model](/assets/airship-model.md) - first pass at the airship asset page, including LOD budgets. (by Priya Halvorsen)
* **Add**: [Inventory](/systems/inventory.md) - initial page covering stacks, slots and the service API. (by Devi Raman)
