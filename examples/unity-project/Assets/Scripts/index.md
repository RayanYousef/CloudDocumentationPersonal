# Scripts

Gameplay services registered by `Bootstrap.cs` at startup. Each sub-folder is one service with its data types beside it.

## Files

* [Bootstrap.cs](Bootstrap.cs) - registers every service in the container and loads the hangar scene.

## Folders

* [Inventory](Inventory/) - item stacks, containers and the InventoryService API used by every other system.
* [Combat](Combat/) - damage pipeline and hit resolution.
* [Persistence](Persistence/) - save slots, JSON serialisation and migrations.
* [Net](Net/) - replication and lag compensation.
