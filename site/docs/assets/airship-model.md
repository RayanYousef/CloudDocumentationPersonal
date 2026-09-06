---
title: Airship Model
description: Documents the player airship mesh, its LOD and texture budgets, and the socket naming that gameplay code relies on for turrets and sails.
type: asset
tags: [art, model, airship, lod]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Models
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Models/Airship.fbx
sidebar_position: 1
---

## Contents

`Airship.fbx` contains the hull, deck, balloon and rigging as separate meshes under a single root, plus the LOD group. The hull is 18k triangles at LOD0, 7k at LOD1 and 1.5k at LOD2; the balloon is a low-poly shell with a normal map doing the work. Textures are 2048 albedo, 2048 normal and a 1024 packed mask (metallic, occlusion, emissive) in the URP Lit layout.

## Sockets

Gameplay code finds attachment points by name, so the socket transforms inside the FBX are part of the contract with [Combat](../systems/combat.md) and the crew system:

* `Socket_Turret_L01` to `Socket_Turret_R04` - eight turret mounts.
* `Socket_Sail_Main`, `Socket_Sail_Jib` - sail attachment for the rigging shader.
* `Socket_Hold` - origin of the cargo hold used by the [Inventory](../systems/inventory.md) drop logic.

Renaming a socket is a breaking change and needs a note in the change log.

## Import settings

Scale factor 1, no animation import, mesh compression off for LOD0 only. Read/Write is disabled; nothing at runtime needs the vertex data on the CPU.
