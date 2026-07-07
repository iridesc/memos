## Context

MCP 服务端位于 `server/router/mcp/`，使用 `mark3labs/mcp-go` 库。Memo 数据的 MCP 响应格式由 `memoJSON` 结构体（`tools_memo.go`）定义，当前包含：Name、Creator、CreateTime、UpdateTime、Content、Visibility、Tags、Pinned、State、Property、Parent。plan_start_time、plan_end_time 和 COMPLETED 状态均未暴露。

Store 层的 `Memo` 结构体（`store/memo.go`）已有 `PlanStartTs *int64`、`PlanEndTs *int64` 字段，以及 `RowStatus = "COMPLETED"` 状态常量。REST API 和前端已完整实现这些功能。

## Goals / Non-Goals

**Goals:**
- MCP 的 `list_memos`、`get_memo`、`search_memos` 响应中包含 `plan_start_time`、`plan_end_time`
- MCP 的 `memoJSON` 中 `state` 字段正确反映 COMPLETED 状态
- MCP 的 `create_memo` 支持传入 `plan_start_time`、`plan_end_time`
- MCP 的 `update_memo` 支持更新 `plan_start_time`、`plan_end_time`，以及将 `state` 设为 COMPLETED

**Non-Goals:**
- 不涉及 `smart` 排序或 today view 的业务逻辑封装（属于后续扩展）
- 不新增 MCP 工具（如 `list_today_memos`）
- 不改动 store 层或 proto 定义
- 不涉及 MCP 的 Resource 模板（`memo://memos/{uid}`）的格式变更

## Decisions

| 决策 | 选择 | 替代方案 | 理由 |
|---|---|---|---|
| 时间字段类型 | `*int64`，Unix 时间戳秒数 | `string` / `*timestamppb.Timestamp` | 与 store 层 `PlanStartTs`/`PlanEndTs` 类型一致，避免序列化复杂度 |
| 空值处理 | `omitempty`，未设置时 JSON 中省略 | 始终返回 `null` | 与现有模式一致，保持 JSON 简洁；也匹配 memoJSON 中 parent 字段的处理方式 |
| COMPLETED 状态映射 | `parseRowStatus` 加上 `store.Completed` | 无 | 最小改动——只是增加一个合法值枚举 |
| create_memo 参数 | 增加可选 `plan_start_time`/`plan_end_time`，同时设置或同时为空 | 允许单独设置 | 与 REST API 的行为一致；后台验证会拒绝单独设置 |
| update_memo 参数 | 增加可选 `plan_start_time`/`plan_end_time`，允许单独设置（通过 field mask） | 强制同时设置 | 与 REST API 一致；后端有完整验证 |

## Risks / Trade-offs

- **[兼容性]** 现有 MCP 客户端（如已连接的 AI 助手）在新增字段后收到更大的 JSON 响应——无害的变更，旧客户端忽略未知字段
- **[数据一致性]** `create_memo` 和 `update_memo` 对 plan_start_time/plan_end_time 的验证规则应与 REST API 一致（create 拒绝过去时间，update 允许过去时间）——需确保 handler 中复用现有验证逻辑
- **[测试覆盖]** 目前 `mcp_test.go` 有基础测试，新增字段和参数后需补充测试用例
