# Combat

Damage pipeline and hit resolution. Every hit becomes a `DamageEvent` that passes through ordered modifier stages.

## Files

* [DamagePipeline.cs](DamagePipeline.cs) - ordered IDamageModifier stages: armour, resistances, crit roll, clamping.
