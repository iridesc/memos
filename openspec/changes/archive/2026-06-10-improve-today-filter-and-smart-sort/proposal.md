## Why

Today 视图当前按 `plan_start_time` 落在今天内过滤，只显示今天"开始"的计划。前天或昨天该完成的过期任务完全不在 Today 中出现——用户无法在 Today 中看到它们，也就不会重新安排或标记完成。改为按 `plan_end_time` 在今天结束之前过滤，让所有截止到今天（含已过期）的任务统一在 Today 视图中管理，减少遗漏。

同时，Smart Sorting 的组内排序方向目前不符合直觉：过期组按 `plan_start_time DESC`（最晚过期的排最前），计划中组按 `plan_start_time DESC`（最晚计划的排最前）。用户真正需要的是按 urgency 排序——过期最久的排最前，马上要开始的排最前。

## What Changes

- **Today 视图筛选条件调整**：`plan_start_ts >= T0 && plan_start_ts < T1` → `plan_end_ts < T1`
- **Today 视图排序调整**：服务端 `orderBy` 从 `plan_start_time asc` 改为 `plan_end_time asc`；客户端 `listSort` 过期组内改为按 `plan_end_time ASC` 排序
- **Smart Sorting 修复**：Tier 1（已过期）组内排序从 `plan_start_time DESC` 改为 `plan_end_time ASC`；Tier 2（计划中）组内排序从 `plan_start_time DESC` 改为 `plan_start_time ASC`
- **`today-panel` spec 更新**：修改"今日计划时间筛选"需求，将筛选字段改为 `plan_end_time`；修改"计划时间排序"需求，将 `orderBy` 改为 `plan_end_time asc`
- **无新增字段或 API 变更**：仅调整现有字段的筛选和排序逻辑

## Capabilities

### New Capabilities
<!-- 无新增能力 -->

### Modified Capabilities
- `today-panel`: 修改"今日计划时间筛选"需求——筛选字段从 `plan_start_time` 改为 `plan_end_time`；修改"计划时间排序"——`orderBy` 从 `plan_start_time asc` 改为 `plan_end_time asc`，客户端排序规则对应调整

## Impact

- `web/src/pages/Today.tsx` — filter 条件、orderBy、listSort 排序逻辑
- `web/src/hooks/useMemoSorting.ts` — smartSort 函数内部排序方向
- `openspec/specs/today-panel/spec.md` — 需求文档更新