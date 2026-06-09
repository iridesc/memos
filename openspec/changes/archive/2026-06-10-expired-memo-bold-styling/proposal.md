## Why

已过期的 memo 在卡片列表中视觉区分度不足——当前使用与"未开始"和"进行中"相同的 muted 字色，用户难以快速扫描识别哪些事项已过期需要处理。需要让已过期状态更醒目，提升用户对过期待办事项的注意力和行动效率。

## What Changes

- 在 MemoHeader 的 `PlanTimeDisplay` 组件中，为 `expired` 状态添加独立的样式分支：字体加粗 (`font-bold`) 并使用警告/危险色系（如 `text-red-500` 或 `text-destructive`），与其他状态（未开始、进行中）的 muted 样式形成视觉对比
- 不影响过期判断逻辑和文本内容，仅修改 CSS 类名

## Capabilities

### New Capabilities
<!-- 无新能力引入 -->
### Modified Capabilities
- `plan-time-relative-display`: 修改已过期状态的视觉样式（字体加粗 + 醒目颜色），状态判断逻辑和国际化文本不变

## Impact

- **前端**: `web/src/components/MemoView/components/MemoHeader.tsx` 中的 `PlanTimeDisplay` 组件
- **无 API 变更、无数据库变更、无后端变更**
