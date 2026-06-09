## 1. Implementation

- [x] 1.1 在 `MemoHeader.tsx` 的 `PlanTimeDisplay` 组件中，为 `expired` 状态分支添加独立 className：`font-bold text-destructive`，保留基础样式（`text-xs ml-2 whitespace-nowrap select-none cursor-pointer hover:opacity-80 transition-colors text-left`），覆盖 `text-muted-foreground` 为 `text-destructive` 并追加 `font-bold`

## 2. Verification

- [x] 2.1 启动开发服务器，验证已过期 memo 的「已过期」文字以加粗红色显示
- [x] 2.2 验证未开始和进行中状态的 memo 样式不受影响
