## Context

`PagedMemoList` renders a `MemoEditor` for new memo creation. The component already uses `useMemoFilterContext()` to derive `defaultCreateTime` and `defaultPlanTimes` from active filters and passes them as props. The editor initializes via `useMemoInit`, which either loads a cached draft or starts empty. Neither the editor nor the init hook is aware of the active tag filter.

## Goals / Non-Goals

**Goals:**
- When a single `tagSearch` filter is active, pre-fill `#tagname ` in the new-memo editor
- Preserve existing draft caching behavior (draft takes priority)
- Only affect new memo creation in `PagedMemoList`, not comments or edits

**Non-Goals:**
- Auto-inserting tags when multiple tag filters are active
- Affecting the comment editor or memo edit mode
- Adding backend or database changes

## Decisions

### Decision 1: Add `defaultContent` prop to MemoEditor / useMemoInit

**Chosen**: Follow the existing pattern used by `defaultCreateTime` — pass a computed `defaultContent` prop from `PagedMemoList` → `MemoEditor` → `useMemoInit`.

**Rationale**: `PagedMemoList` already owns the filter-derived editor presets. Adding `defaultContent` follows the same prop-drilling pattern as `defaultCreateTime` and `defaultPlanTimes`, keeping the editor component agnostic of filter logic.

**Alternatives considered**:
- *Read filter context inside `MemoEditorImpl`*: Simpler prop-wise but couples editor to filter context and would affect comment/edit modes.
- *Insert tag at save time*: Would modify the user's content without their awareness; inserting at editor-open is transparent and user-editable.

### Decision 2: Precedence — draft > default content

**Chosen**: In `useMemoInit`, apply `defaultContent` only when all are true: (a) not editing an existing memo, (b) no cached draft exists, (c) `defaultContent` is provided.

**Rationale**: A user's unsaved draft should never be overwritten by an automated default.

## Risks / Trade-offs

- **Risk**: If a user clears the draft cache and re-opens the editor, the tag will re-insert. **Mitigation**: This matches the editor reset flow — if you clear your draft, you start fresh with the filter defaults, which is expected behavior.
- **Trade-off**: The tag is inserted as plain text rather than a structured tag field. This means it's part of the content and deletable, which is exactly what the user wants.

## Open Questions

<!-- None -->
