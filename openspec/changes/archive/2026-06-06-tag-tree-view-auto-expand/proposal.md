## Why

Tags in Memodo naturally form hierarchies via `/` separators (e.g., `project/frontend`, `project/backend`), but the default flat view hides this structure from users. New users who haven't discovered the tree view toggle miss out on the hierarchical organization. Making the tree view the default—with nodes auto-expanded—gives users immediate visibility into their tag hierarchy without requiring manual configuration.

## What Changes

- Change the default value of `tag-view-as-tree` localStorage key from `false` to `true`, making the tree view the out-of-the-box display mode for tags
- Change the default value of `tag-tree-auto-expand` localStorage key from `false` to `true`, so all tree nodes are expanded by default when viewing tags in tree mode
- Both settings remain user-configurable via the existing popover menu in the Tags section sidebar

## Capabilities

### New Capabilities
- `tag-tree-default-view`: Tags sidebar defaults to tree view with all nodes auto-expanded on first use. Users can still toggle back to flat view and collapse nodes via the existing UI.

### Modified Capabilities
<!-- None — this is a default value change, not a requirement change to existing capabilities -->

## Impact

- **Affected code**: `web/src/components/MemoExplorer/TagsSection.tsx` — two default value changes in `useLocalStorage` calls (lines 18-19)
- **No API, database, or proto changes**
- **No breaking changes** — existing users who have already set these localStorage keys will not be affected; only new users or users who haven't toggled these settings will see the new defaults
