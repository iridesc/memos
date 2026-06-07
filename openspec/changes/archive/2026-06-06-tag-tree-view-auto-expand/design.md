## Context

The Tags sidebar (`web/src/components/MemoExplorer/TagsSection.tsx`) supports two display modes: flat list and hierarchical tree. Currently, both `tag-view-as-tree` and `tag-tree-auto-expand` localStorage keys default to `false`. The tree mode is hidden behind a popover menu that many users never discover. Tags using `/` separators (e.g., `work/project`) are shown flat, obscuring their hierarchical relationship.

## Goals / Non-Goals

**Goals:**
- Make tree view the default display mode for new users and users who haven't explicitly set a preference
- Auto-expand all tree nodes by default so the full hierarchy is immediately visible
- Preserve existing user preferences — users who have already toggled these settings are unaffected

**Non-Goals:**
- Changing the tree rendering logic or UI
- Adding new settings, preferences, or UI controls
- Modifying the flat list view behavior
- Adding any backend, database, or API changes

## Decisions

### Decision 1: Change localStorage default values only

**Chosen**: Change the second argument to `useLocalStorage` from `false` to `true` for both keys in `TagsSection.tsx` lines 18-19.

**Rationale**: `useLocalStorage` returns the default value only when no value exists for the key in localStorage. Once a user toggles the setting, the value is written to localStorage and the default is no longer used. This means:
- New users get tree view auto-expanded
- Existing users who haven't touched these settings get the new defaults
- Existing users who have set preferences keep them unchanged

**Alternatives considered**:
- *Add a user preference in backend settings*: Over-engineered for a UI display preference. localStorage is the established pattern in the frontend for display preferences.
- *Remove flat view entirely*: Unnecessary and reduces user choice. The flat view is useful for users with few tags or flat tag structures.

### Decision 2: Keep both toggles independent

**Chosen**: Keep `tag-view-as-tree` and `tag-tree-auto-expand` as separate, independently configurable settings with separate localStorage keys.

**Rationale**: A user might want tree view but prefer nodes collapsed, or vice versa. The two settings control different behaviors and should remain independent. The auto-expand toggle in the UI is already disabled when tree mode is off, which is the correct UX.

## Risks / Trade-offs

- **Risk**: Users with many deeply nested tags might find the auto-expanded tree overwhelming. **Mitigation**: The auto-expand toggle is immediately accessible in the popover menu; users who prefer collapsed nodes can toggle it off in one click.
- **Trade-off**: The flat view is simpler for users with few tags. This change adds one extra click (toggle tree mode off) for those users. Given that hierarchical tags are a key feature of Memodo, and the tree view better represents `/`-separated tags, this trade-off is acceptable.

## Open Questions

<!-- None -->
