# Net

Networking layer: what is replicated, who is authoritative, and how late input is reconciled.

## Files

* [ReplicationService.cs](ReplicationService.cs) - host-authoritative state replication to clients.
* [LagCompensator.cs](LagCompensator.cs) - rewind window (250 ms cap) used to validate late hits.
