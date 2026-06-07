## 1. Implementation

- [x] 1.1 Change `tag-view-as-tree` localStorage default from `false` to `true` in `web/src/components/MemoExplorer/TagsSection.tsx` line 18
- [x] 1.2 Change `tag-tree-auto-expand` localStorage default from `false` to `true` in `web/src/components/MemoExplorer/TagsSection.tsx` line 19

## 2. Verification

- [x] 2.1 Run `pnpm lint` to verify no type or lint errors
- [x] 2.2 Manually verify: clear localStorage, open app, confirm tags display as tree with nodes auto-expanded
- [x] 2.3 Manually verify: toggle tree mode off and auto-expand off, reload, confirm preferences persist
