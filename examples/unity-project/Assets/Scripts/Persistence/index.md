# Persistence

Save and load. `SaveService` owns the slot layout; `Migrations/` upgrades older files.

## Files

* [SaveService.cs](SaveService.cs) - writes gzipped JSON save slots and applies migrations when loading.

## Folders

* [Migrations](Migrations/) - schema upgrade steps, one per version bump.
