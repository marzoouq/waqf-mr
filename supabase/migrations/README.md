# Migrations

Append-only ledger of database changes. **Never edit applied migrations.**

## Rollup policy

The current count (320+) is healthy but trends upward over time. A schema
rollup (consolidating historical migrations into a baseline snapshot) is
**deferred** until a quiet window approved by the Nazir (admin). Until then,
all new changes go in new dated files via the migration tool.
