## Why
Dragging memo cards interferes with mobile scrolling and selection. Explicit move actions provide predictable ordering. The editor toolbar also overflows on narrow screens.

## What Changes
- Remove memo drag sorting and editor file drop uploads.
- Add Today-only move up/down menu actions, preserving order across refreshes.
- Handle legacy missing/duplicate ordering keys, pagination, pending requests and failures.
- Wrap the editor toolbar and constrain the time popup to the viewport.

## Capabilities
### New Capabilities
- `memo-order-actions`: Explicit persistent Today ordering through memo menus.

## Impact
Frontend list/editor/menu, translations and dependency lockfile; regenerate existing Today order API definitions and repair string conversion. No new schema or database migration.
