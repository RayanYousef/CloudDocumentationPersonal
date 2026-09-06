# Inventory

Host-authoritative item storage. All mutations go through `InventoryService`; `ItemStack` is the value type stored in every container slot.

## Files

* [InventoryService.cs](InventoryService.cs) - TryAdd / TryRemove / Move API and the InventoryChanged event.
* [ItemStack.cs](ItemStack.cs) - immutable struct of ItemId, count and quality seed; ItemStack.Empty marks free slots.
