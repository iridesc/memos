## Context
Today already sorts on today_order, but generated API bindings omit that field. Nullable store strings need conversion to protobuf strings.

## Decisions
Provide per-card movement context only for active Today memos. Resolve all remaining pages before moving so neighboring keys and legacy initialization are complete. Preserve valid keys and write only the moved memo; initialize the active sequence when keys are absent, duplicate or invalid. Show an optimistic list order while saving, block concurrent moves, compensate successful initialization writes on failure, and refetch canonical server order afterwards. Completed memos retain completion-time sorting.

Remove the drag-only edit reporting context and all dnd-kit dependencies. Retain attachment picker and clipboard upload.

Use toolbar wrapping and nonshrinking action buttons, truncate the time summary and constrain date inputs/popover on small screens.

## Tradeoffs
The first move loads remaining Today pages. Legacy key initialization requires multiple existing update requests; compensating writes are best effort under network failure. An atomic reorder endpoint could improve concurrent multi-client behavior later.

The MySQL fresh-install schema was also missing the existing today_order column; align LATEST.sql with its already-present incremental migration.
