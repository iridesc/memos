## Why

MCP 是 Memodo 提供给 AI 助手的标准接口。目前 memo 的计划时间（plan_start_time / plan_end_time）和完成状态（COMPLETED）已在 UI 和 REST API 中完整实现，但 MCP 接口尚未暴露这些字段，导致 AI 助手无法读取或操作这些信息——AI 读到的 memo 数据不完整，也无法通过 MCP 执行标记完成、设置计划时间等操作。

## What Changes

- **memoJSON 响应增加 plan_start_time / plan_end_time 字段**：`get_memo`、`list_memos`、`search_memos` 等只读工具返回的 memo 数据结构中增加两个可选字段
- **memoJSON 响应正确映射 COMPLETED 状态**：当前 `state` 字段只映射 NORMAL/ARCHIVED，需新增 COMPLETED 的映射
- **create_memo 工具增加 plan_start_time / plan_end_time 可选参数**：允许 AI 创建 memo 时设置计划时间
- **update_memo 工具增加 plan_start_time / plan_end_time 可选参数**：允许 AI 更新 memo 时修改计划时间
- **update_memo 工具支持将 state 设为 COMPLETED**：允许 AI 标记 memo 为完成

## Capabilities

### New Capabilities
- `memo-plan-time-mcp`: 通过 MCP 接口暴露和操作 memo 的计划时间字段

### Modified Capabilities
<!-- 不涉及 spec 级别的行为变更，MCP 接口只是透传已在 REST API 中实现的数据 -->

## Impact

- `server/router/mcp/tools_memo.go`：memoJSON 结构体、storeMemoToJSON、parseRowStatus、create_memo/update_memo 的工具定义和 handler
- `server/router/mcp/mcp_test.go`：更新测试用例覆盖新增字段
