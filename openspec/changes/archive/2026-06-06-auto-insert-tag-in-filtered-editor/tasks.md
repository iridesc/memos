## 1. Add `defaultContent` prop

- [x] 1.1 Add `defaultContent?: string` to `MemoEditorProps` in `web/src/components/MemoEditor/types/components.ts`
- [x] 1.2 Add `defaultContent?: string` to `UseMemoInitOptions` in `web/src/components/MemoEditor/hooks/useMemoInit.ts`
- [x] 1.3 In `useMemoInit`, apply `defaultContent` when no memo, no cached draft, and `defaultContent` is provided

## 2. Thread `defaultContent` through components

- [x] 2.1 In `MemoEditorImpl`, destructure `defaultContent` from props and pass to `useMemoInit`
- [x] 2.2 In `PagedMemoList`, compute tag prefix from single active `tagSearch` filter and pass as `defaultContent` to `MemoEditor`

## 3. Verification

- [x] 3.1 Run `pnpm lint` to verify no type or lint errors
- [x] 3.2 Manually verify: filter by single tag → open editor → `#tag ` pre-filled, still editable
- [x] 3.3 Manually verify: filter by multiple tags or no tag → editor starts empty
- [x] 3.4 Manually verify: edit mode / comment mode not affected
