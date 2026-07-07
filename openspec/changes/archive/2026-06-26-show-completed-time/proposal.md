## Why

已完成 memo 目前仅显示「已完成」文字标签，用户无法直观知道 memo 是何时被标记为完成的。显示完成时间可以让用户更好地追踪任务完成进度和时间线。

## What Changes

- 在 memo 卡片头部（MemoHeader）的「已完成」绿色标签旁，展示 memo 被标记为完成的时间
- 完成时间使用 `updateTime`（memo 的最后更新时间）作为完成时间的近似值
- 时间格式遵循系统已有的相对时间/绝对时间展示风格

## Capabilities

### New Capabilities

<!-- 纯前端展示变更，不涉及新 capability -->

### Modified Capabilities

- `memo-completed-state`: 已完成状态的展示需包含完成时间信息

## Impact

- **前端**: `web/src/components/MemoView/components/MemoHeader.tsx` — `PlanTimeDisplay` 组件中已完成状态的渲染
- **i18n**: 可能需要新增或调整翻译 key
- **不涉及**后端/Proto/数据库变更
