## Context

Today 视图和 Smart Sorting 共用 `plan_end_time` 作为过期判定依据，但两者的排序方向不同。Today 使用独立的 `listSort` 客户端排序，而 Smart Sorting 被 Home 和 UserProfile 页面共用。两者之间没有代码共享，可以独立修改。

现有的 `today-panel` spec 定义的 filter 为 `plan_start_ts >= T0 && plan_start_ts < T1`，需要更新为 `plan_end_ts < T1`。`memo-plan-time` spec 中关于 API 能力（order_by、筛选）没变化，不需要修改。

## Goals / Non-Goals

**Goals:**
- 将 Today 视图的 filter 从按 `plan_start_time` 筛选改为按 `plan_end_time` 筛选
- 调整 Today 视图的排序：过期组按 `plan_end_time ASC`，活跃组按 `plan_start_time ASC`（不变）
- 修复 Smart Sorting 过期组排序方向为 `plan_end_time ASC`
- 修复 Smart Sorting 计划中组排序方向为 `plan_start_time ASC`

**Non-Goals:**
- 不改动 API 层——`ListMemos` 的 filter 和 order_by 能力保持不变
- 不改动数据库 schema
- 不改动页面布局或 UI 组件
- 不改动 Today 编辑器的默认时间填充逻辑

## Decisions

### Decision 1: Today 保持独立排序，不依赖 Smart Sorting

Today 的数据范围（仅 `plan_end_ts < endOfToday`）和 Home 的全量数据有本质不同，Today 还需要支持拖拽排序（需要 `ASC` 让插入位置可预测）。保持 Today 自己的 `listSort` 更清晰。

### Decision 2: Smart Sorting 过期组用 `plan_end_time` 而不是 `plan_start_time` 排序

过期组的成员已经定义为 `planEndTime < now`，所以最自然的排序方式是按 `plan_end_time ASC`——最早过期的排最前（最 urgent）。用 `plan_start_time` 排序会打乱这个直觉顺序。

### Decision 3: 服务端 `orderBy` 保留 `plan_end_time asc`

Today 的 `orderBy` 改为 `plan_end_time asc` 后，服务端返回的数据已经大体有序。客户端 `listSort` 再做精细的过期分组排序，两者协同减少客户端排序量。

## Risks / Trade-offs

- **[兼容性] Today 页面 filter 变化** → 用户进入 Today 会看到比之前更多的 memo（含前几天过期的）。这是预期的行为变化，不是回归。
- **[Drag-and-drop] 拖拽后更新 plan_start_time** → 拖拽后新位置基于 start_time 计算，但 filter 是按 end_time 过滤的。如果用户把一个今天到期的任务拖到很晚，它仍在 Today 里。行为一致，无风险。
- **[前端性能] filter 只设 `plan_end_ts < T1`，不设下界** → 会返回历史上所有设了 plan_end_time 的 memo（只要还没到 tomorrow 0:00）。对长期用户可能返回大量数据。可通过分页机制自然控制，暂时不需要额外优化。