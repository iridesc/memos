## ADDED Requirements

### Requirement: Memo 具备可选的计划开始时间和计划结束时间

系统应当为每个 memo 提供 `plan_start_time` 和 `plan_end_time` 两个可选字段。两个字段独立存在：可以只设置其中之一，也可以同时设置两者。当字段未设置时，其值为空（NULL）。

字段类型为 `google.protobuf.Timestamp`，精度到秒。API 响应中未设置的字段应被省略。

#### Scenario: 创建带计划时间的 memo

- **WHEN** 用户通过 `CreateMemo` API 创建 memo 并设置 `plan_start_time = 2024-06-05T09:00:00Z` 和 `plan_end_time = 2024-06-10T18:00:00Z`
- **THEN** 系统存储该 memo 并将两个计划时间字段持久化，`GetMemo` 和 `ListMemos` 响应中返回这两个字段

#### Scenario: 创建不带计划时间的 memo

- **WHEN** 用户通过 `CreateMemo` API 创建 memo 且未设置 `plan_start_time` 和 `plan_end_time`
- **THEN** 系统存储该 memo，两个计划时间字段均为空，`GetMemo` 和 `ListMemos` 响应中不包含这两个字段

#### Scenario: 更新 memo 的计划时间

- **WHEN** 用户通过 `UpdateMemo` API 更新 memo，`update_mask` 包含 `plan_start_time`，并设置新值
- **THEN** 系统更新该 memo 的 `plan_start_time` 字段为新值，`plan_end_time` 保持不变

#### Scenario: 清除已设置的计划时间

- **WHEN** 用户通过 `UpdateMemo` API 更新 memo，`update_mask` 包含 `plan_start_time`，但请求体中 `plan_start_time` 为空
- **THEN** 系统将该 memo 的 `plan_start_time` 清空为 NULL

### Requirement: 支持按计划时间排序 memo 列表

系统应当支持在 `ListMemos` API 的 `order_by` 参数中使用 `plan_start_time` 和 `plan_end_time` 作为排序字段。排序方向支持 `asc` 和 `desc`。与 `pinned` 组合时，`pinned` 始终优先。

#### Scenario: 按计划开始时间升序排列

- **WHEN** 用户调用 `ListMemos` 并设置 `order_by = "plan_start_time asc"`
- **THEN** 系统返回按 `plan_start_ts` 升序排列的 memo 列表，未设置计划开始时间的 memo 排在末尾（NULL 视为最小值）

#### Scenario: 按计划结束时间降序排列

- **WHEN** 用户调用 `ListMemos` 并设置 `order_by = "plan_end_time desc"`
- **THEN** 系统返回按 `plan_end_ts` 降序排列的 memo 列表

#### Scenario: 置顶优先，再按计划开始时间排列

- **WHEN** 用户调用 `ListMemos` 并设置 `order_by = "pinned desc, plan_start_time asc"`
- **THEN** 系统返回置顶 memo 在前，置顶 memo 内部按 `plan_start_ts` 升序排列，非置顶 memo 在后并同样按 `plan_start_ts` 升序排列

#### Scenario: 无效的排序字段

- **WHEN** 用户调用 `ListMemos` 并设置 `order_by = "invalid_field desc"`
- **THEN** 系统返回 `INVALID_ARGUMENT` 错误

### Requirement: 前端 memo 卡片展示计划时间范围

前端 memo 卡片的 Header 区域应当展示计划时间范围。仅当 `plan_start_time` 或 `plan_end_time` 至少有一个存在时才展示。展示位置在创建时间旁边。

#### Scenario: 两个计划时间均存在

- **WHEN** memo 的 `plan_start_time` 和 `plan_end_time` 均已设置
- **THEN** MemoHeader 中显示 `📅 开始日期 ~ 结束日期` 格式的计划时间范围，例如 `📅 2024-06-05 ~ 2024-06-10`

#### Scenario: 仅计划开始时间存在

- **WHEN** memo 仅设置了 `plan_start_time`，`plan_end_time` 为空
- **THEN** MemoHeader 中显示 `📅 从 2024-06-05 开始`

#### Scenario: 仅计划结束时间存在

- **WHEN** memo 仅设置了 `plan_end_time`，`plan_start_time` 为空
- **THEN** MemoHeader 中显示 `📅 截止于 2024-06-10`

#### Scenario: 两个计划时间均不存在

- **WHEN** memo 的 `plan_start_time` 和 `plan_end_time` 均为空
- **THEN** MemoHeader 中不显示任何计划时间相关信息

#### Scenario: 时间悬停提示

- **WHEN** 用户将鼠标悬停在计划时间显示区域上
- **THEN** 显示 tooltip 包含完整的计划开始和结束时间（如果存在），格式为本地化的日期时间字符串

### Requirement: 前端编辑器支持设置计划时间

前端 memo 编辑器的底部元数据区应当提供日期时间选择器，允许用户设置和清除计划开始时间和计划结束时间。

#### Scenario: 设置计划时间

- **WHEN** 用户点击编辑器底部的计划时间按钮，弹出日期时间选择器
- **THEN** 用户可以分别选择开始日期时间和结束日期时间，点击确定后计划时间被设置

#### Scenario: 仅设置部分时间

- **WHEN** 用户在编辑器中选择计划开始时间但不设置结束时间
- **THEN** 创建的 memo 仅包含 `plan_start_time`，`plan_end_time` 为空

#### Scenario: 清除已设置的计划时间

- **WHEN** 用户点击计划时间选择器中的清除按钮
- **THEN** 对应的计划时间字段被清空

### Requirement: 前端排序下拉支持计划时间选项

前端 memo 列表的排序设置菜单应当提供「计划开始时间」和「计划结束时间」作为排序字段选项，与现有的「创建时间」「更新时间」并列。

#### Scenario: 按计划开始时间排序

- **WHEN** 用户在排序下拉中选择「计划开始时间」并选择「最早在前」
- **THEN** memo 列表按 `plan_start_time` 升序重新排列，排序偏好持久化到 localStorage

#### Scenario: 排序偏好持久化

- **WHEN** 用户设置排序字段为「计划结束时间」并刷新页面
- **THEN** 排序设置保持为「计划结束时间」，列表按该字段排序

#### Scenario: 兼容旧版排序偏好

- **WHEN** 用户的 localStorage 中存储的是旧版排序偏好（仅 `create_time` / `update_time`）
- **THEN** 系统正常读取旧版偏好并迁移到新版数据结构
