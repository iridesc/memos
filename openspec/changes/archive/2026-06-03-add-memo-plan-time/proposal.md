## Why

Memos 当前的 memo 只有 `create_time`（创建时间）和 `update_time`（更新时间），无法表达「计划什么时候做」这一常见需求。用户希望用 memo 管理待办事项和日程规划时，需要一个独立于创建/更新时间的时间维度来标记计划执行的时间范围。增加计划开始时间和计划结束时间，让 Memos 从纯笔记工具向轻量任务规划延伸。

## What Changes

- 为 memo 新增 `plan_start_time` 和 `plan_end_time` 两个可选字段，类型为 `google.protobuf.Timestamp`，默认空（未设置）
- 数据库新增 `plan_start_ts` 和 `plan_end_ts` 两个 BIGINT 列，允许 NULL
- 支持通过 `order_by` 参数按 `plan_start_time` 或 `plan_end_time` 排序 memo 列表
- 前端 memo 卡片 Header 区域展示计划时间范围（仅在存在时显示）
- 前端编辑器底部元数据区增加日期时间选择器，用于设置计划时间
- 前端排序下拉菜单增加「计划开始时间」「计划结束时间」选项

## Capabilities

### New Capabilities

- `memo-plan-time`: memo 的计划开始时间和计划结束时间的存储、API 暴露、排序支持、前端展示与编辑

### Modified Capabilities

<!-- 无现有 capability 被修改 -->

## Impact

- **Proto API**: `proto/api/v1/memo_service.proto` — Memo 消息新增 field 19 (`plan_start_time`) 和 field 20 (`plan_end_time`)，`ListMemosRequest.order_by` 注释更新
- **数据库**: SQLite、PostgreSQL、MySQL 三个 driver 各新增 migration 文件并更新 `LATEST.sql`
- **Store 层**: `store/memo.go` — Memo、UpdateMemo、FindMemo 结构体新增对应字段；三个 driver 的 CRUD 实现新增列读写和 ORDER BY 逻辑
- **API 层**: `server/router/api/v1/memo_service_converter.go` 新增时间转换函数；`memo_service.go` 的 CreateMemo、UpdateMemo、parseMemoOrderBy 支持新字段
- **前端**: 类型重新生成；MemoHeader 展示组件；MemoViewContext 派生数据；排序 hook/context/UI；编辑器日期选择器
- **无破坏性变更**: 新字段均为可选，默认空，现有 API 客户端和数据不受影响
