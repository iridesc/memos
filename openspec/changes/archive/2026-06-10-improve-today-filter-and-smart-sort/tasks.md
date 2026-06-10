## 1. Smart Sorting 排序修复

- [x] 1.1 修改 `smartSort` 过期组（Tier 1）内排序：从 `plan_start_time DESC` 改为 `plan_end_time ASC`
- [x] 1.2 修改 `smartSort` 计划中组（Tier 2）内排序：从 `plan_start_time DESC` 改为 `plan_start_time ASC`

## 2. Today 视图筛选与排序调整

- [x] 2.1 修改 `todayFilter`：从 `plan_start_ts >= T0 && plan_start_ts < T1` 改为 `plan_end_ts < T1`
- [x] 2.2 修改 `orderBy`：从 `plan_start_time asc` 改为 `plan_end_time asc`
- [x] 2.3 修改 `listSort` 过期组内排序：从 `plan_start_time ASC` 改为 `plan_end_time ASC`
- [x] 2.4 验证 Today 空状态、分页、拖拽排序行为正常

## 3. 主 Spec 同步

- [x] 3.1 将 delta spec 同步到主 spec：更新 `openspec/specs/today-panel/spec.md` 中的 "今日计划时间筛选" 和 "计划时间排序" 需求