## Why

当前 memo 系统已具备计划时间功能和归档机制，但缺少明确的「完成」状态。归档（ARCHIVED）的语义是「从视野中隐藏」，不同于「标记为完成」——已完成的 todo 任务仍需在列表中可见、可回溯。本变更在现有 NORMAL/ARCHIVED 之间插入 COMPLETED 状态，让 memo 能够表达「已完成但尚未归档」的中间态，使 memos 具备完整的 todo 任务管理能力。

## What Changes

- `row_status` 列新增 `COMPLETED` 枚举值，形成 NORMAL → COMPLETED → ARCHIVED 三态
- 有计划时间的 memo 卡片右下角展示勾选框，点击即可标记完成/取消完成
- memo 列表底部新增「已完成」折叠区（默认收起），展开后使用与活跃区相同的排序和筛选条件
- `ListMemos` 默认同时返回 NORMAL 和 COMPLETED 状态的 memo，保持单次请求
- 归档（ARCHIVED）行为不变，仍为创建者专属、对外 404、禁止交互
- **BREAKING**: `row_status` CHECK 约束变更，`State` proto 枚举新增值，需 migration

## Capabilities

### New Capabilities

- `memo-completed-state`: 为 memo 增加 COMPLETED 状态，提供勾选完成/取消完成的 UI，以及在列表底部折叠区展示已完成 memo 的能力

### Modified Capabilities

- `memo-plan-time`: 修改「前端 memo 卡片展示计划时间范围」——有计划时间的 memo 卡片右下角需展示完成勾选框

## Impact

- **数据库**: 所有 3 个驱动（SQLite/MySQL/PostgreSQL）的 migration，`memo` 表 `row_status` CHECK 约束从 `('NORMAL','ARCHIVED')` 扩展为 `('NORMAL','COMPLETED','ARCHIVED')`
- **Proto**: `common.proto` 中 `State` 枚举新增 `COMPLETED = 3`，需 `buf generate`
- **Store 层**: `store/common.go` 新增 `Completed` 常量，ListMemos 查询逻辑调整（默认返回 NORMAL + COMPLETED）
- **API 层**: `ListMemos` 的 `state` 过滤逻辑调整，默认返回 NORMAL 和 COMPLETED；`UpdateMemo` 无需改动
- **前端**: `PagedMemoList` 拆分为活跃区 + 折叠完成区；`MemoView` 卡片新增勾选框；`MemoActionMenu` 适配三态；新增 `useMemoCompletedGroups` hook