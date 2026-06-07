## Why

When a user is viewing memos filtered by a single tag (e.g., browsing `#project`), they almost always want new memos to carry that same tag. Currently, the user must manually type `#project` each time they create a memo in a filtered view. Auto-inserting the active tag at the beginning of the editor saves keystrokes while keeping full flexibility — the user can delete or modify it freely.

## What Changes

- When exactly one `tagSearch` filter is active, the memo editor pre-fills with `#tagname ` at the beginning of the content
- This only applies to new memo creation (not editing existing memos, not comments)
- If a cached draft exists in localStorage, the draft takes priority (no overwrite)
- The inserted tag is plain text — user can edit, delete, or move it freely

## Capabilities

### New Capabilities
- `tag-auto-insert-on-create`: When creating a new memo while a single tag filter is active, the editor pre-fills `#tag ` at the content start.

### Modified Capabilities
<!-- None — new capability only -->

## Impact

- **Affected code**:
  - `web/src/components/MemoEditor/types/components.ts` — add `defaultContent` prop
  - `web/src/components/MemoEditor/hooks/useMemoInit.ts` — handle `defaultContent` in init
  - `web/src/components/MemoEditor/index.tsx` — pass `defaultContent` through
  - `web/src/components/PagedMemoList/PagedMemoList.tsx` — compute tag prefix from filters
- **No API, database, or proto changes**
- **No breaking changes**
