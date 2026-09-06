---
title: Getting Started
description: Read this first if you need to clone, open and run the Skyforge Unity project locally for the first time.
type: guide
tags: [onboarding, setup, unity]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/README.md
sidebar_position: 2
---

## Prerequisites

Skyforge targets **Unity 6000.0.32f1** with the Universal Render Pipeline. Install it through Unity Hub together with the Windows and Android build modules. You also need Git LFS, because every `.fbx` and texture in `Assets/Models` is stored as an LFS pointer.

## Clone and open

```
git clone https://github.com/skyforge-studio/skyforge.git
cd skyforge && git lfs pull
```

Open the folder from Unity Hub. The first import takes around six minutes on a laptop because the addressables catalog is rebuilt. Once the editor is up, load `Assets/Scenes/Bootstrap.unity` and press Play; the bootstrap scene spins up the service container and loads the hangar.

## Where to go next

The runtime is split into services registered at startup. The three you will touch most are described under [Systems](systems/): start with the [Inventory](systems/inventory.md), which nearly everything else depends on, and then read [Save System](systems/save-system.md) to understand how state survives between sessions.

If you are here to author content rather than code, jump to [Assets](assets/) instead. Architecture questions that were already argued out live under [Decisions](decisions/); check there before reopening a debate.
