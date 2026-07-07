## Context

当前 `MemoHeader` 中的 `PlanTimeDisplay` 组件在 memo 已完成时展示绿色「已完成」文字标签，但不显示完成时间。已完成 memo 的 `updateTime` 在状态变更时更新，可作为完成时间的近似值。

`PlanTimeDisplay` 已通过 `useMemoViewDerived()` 获取 `updateTime`，且已在 tooltip 中使用。本次变更只需在已完成状态的渲染中额外展示时间。

## Goals / Non-Goals

**Goals:**
- 在「已完成」标签旁展示完成时间，提升信息密度
- 复用现有时间格式化逻辑，保持 UI 一致性

**Non-Goals:**
- 不增加数据库字段（如 `completed_at`）
- 不修改 API/Proto
- 不改变 checkbox 交互逻辑

## Decisions

**使用 `updateTime` 作为完成时间**
- 当用户勾选完成时，`updateTime` 会被后端更新为当前时间，自然反映了完成时间
- 无需后端变更，实现成本最低
- 若 memo 在完成后被编辑，`updateTime` 会更新为编辑时间——这是一个已知权衡，但对于大多数场景，用户更关心「最后一次操作时间」

**时间格式：仅显示日期**
- 与系统中 memo 列表的日期显示风格保持一致（如 `6/26`）
- 避免已完成标签区域过于冗长

**实现位置：仅修改 `PlanTimeDisplay` 组件**
- 当 `isCompleted` 为 true 时，在 `{t("common.completed")}` 后追加格式化的 `updateTime`
- 不修改 tooltip 内容（tooltip 已包含完整时间信息）

## Risks / Trade-offs

- 编辑已完成 memo 后「完成时间」会更新为编辑时间 → 用户可以接受，这是 memo 类应用的常见行为；未来如需精确完成时间可添加 `completed_at` 字段
