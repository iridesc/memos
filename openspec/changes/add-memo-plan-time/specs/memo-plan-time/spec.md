## ADDED Requirements

### Requirement: Memo 具备可选的计划开始时间和计划结束时间

系统应当为每个 memo 提供 `plan_start_time` 和 `plan_end_time` 两个可选字段。两个字段必须同时设置或同时为空——不允许只设其中一个。当字段未设置时，其值为空（NULL）。

字段类型为 `google.protobuf.Timestamp`，精度到分钟。API 响应中未设置的字段应被省略。

#### Scenario: 创建带计划时间的 memo

- **WHEN** 用户通过 `CreateMemo` API 创建 memo 并设置 `plan_start_time = 2024-06-05T09:00:00Z` 和 `plan_end_time = 2024-06-10T18:00:00Z`
- **THEN** 系统存储该 memo 并将两个计划时间字段持久化，`GetMemo` 和 `ListMemos` 响应中返回这两个字段

#### Scenario: 创建不带计划时间的 memo

- **WHEN** 用户通过 `CreateMemo` API 创建 memo 且未设置 `plan_start_time` 和 `plan_end_time`
- **THEN** 系统存储该 memo，两个计划时间字段均为空，`GetMemo` 和 `ListMemos` 响应中不包含这两个字段

#### Scenario: 更新 memo 的计划时间

- **WHEN** 用户通过 `UpdateMemo` API 更新 memo，`update_mask` 同时包含 `plan_start_time` 和 `plan_end_time`，并设置新值
- **THEN** 系统更新该 memo 的两个计划时间字段为新值

#### Scenario: 清除已设置的计划时间

- **WHEN** 用户通过 `UpdateMemo` API 更新 memo，`update_mask` 同时包含 `plan_start_time` 和 `plan_end_time`，且两者均为空
- **THEN** 系统将该 memo 的 `plan_start_time` 和 `plan_end_time` 同时清空为 NULL

#### Scenario: 仅设置一个字段被拒绝

- **WHEN** 用户通过 `CreateMemo` 或 `UpdateMemo` API 仅设置 `plan_start_time` 而未设置 `plan_end_time`
- **THEN** 系统返回 `INVALID_ARGUMENT` 错误，提示两者必须同时设置

### Requirement: 计划时间验证规则

系统必须对计划时间执行以下验证：

1. `plan_start_time` 和 `plan_end_time` 必须同时设置或同时为空
2. `plan_start_time` 不得早于当前时间
3. `plan_end_time` 必须大于或等于 `plan_start_time`

#### Scenario: 开始时间在过去被拒绝

- **WHEN** 用户设置 `plan_start_time` 为昨天的日期时间
- **THEN** 系统返回 `INVALID_ARGUMENT` 错误，提示计划开始时间不能在过去

#### Scenario: 结束时间早于开始时间被拒绝

- **WHEN** 用户设置 `plan_start_time = 2024-06-10T09:00:00Z` 且 `plan_end_time = 2024-06-09T18:00:00Z`
- **THEN** 系统返回 `INVALID_ARGUMENT` 错误，提示结束时间必须大于或等于开始时间

#### Scenario: 仅设置开始时间被拒绝

- **WHEN** 用户仅设置 `plan_start_time` 而未设置 `plan_end_time`
- **THEN** 系统返回 `INVALID_ARGUMENT` 错误，提示两者必须同时设置

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

前端 memo 卡片的 Header 区域应当展示计划时间范围。仅当 `plan_start_time` 和 `plan_end_time` 均存在时才展示。展示位置在创建时间旁边，精确到分钟。

#### Scenario: 计划时间存在

- **WHEN** memo 的 `plan_start_time` 和 `plan_end_time` 均已设置
- **THEN** MemoHeader 中显示 `📅 开始日期时间 ~ 结束日期时间` 格式的计划时间范围，精确到分钟，例如 `📅 2024-06-05 09:00 ~ 2024-06-10 18:00`

#### Scenario: 计划时间不存在

- **WHEN** memo 的 `plan_start_time` 和 `plan_end_time` 均为空
- **THEN** MemoHeader 中不显示任何计划时间相关信息

#### Scenario: 时间悬停提示

- **WHEN** 用户将鼠标悬停在计划时间显示区域上
- **THEN** 显示 tooltip 包含完整的计划开始和结束时间（如果存在），格式为本地化的日期时间字符串

### Requirement: 前端编辑器支持设置计划时间

前端 memo 编辑器的底部元数据区应当提供日期时间选择器，允许用户设置和清除计划开始时间和计划结束时间。选择器精确到分钟。

#### Scenario: 设置计划时间

- **WHEN** 用户点击编辑器底部的计划时间按钮（日历图标），弹出日期时间选择器
- **THEN** 用户可以分别选择开始日期时间和结束日期时间

#### Scenario: 开始时间后自动填充结束时间

- **WHEN** 用户在编辑器中选择计划开始时间
- **THEN** 系统自动将计划结束时间设为「开始时间 + 24 小时」，用户可手动修改结束时间

#### Scenario: 清除计划时间

- **WHEN** 用户点击计划时间选择器中的清除按钮，或点击弹窗外的清除按钮
- **THEN** `plan_start_time` 和 `plan_end_time` 同时被清空

#### Scenario: 首次选择时清除按钮可见

- **WHEN** 用户首次打开计划时间选择器并选择了一个开始时间（尚未选择结束时间）
- **THEN** 弹窗底部的清除按钮应当可见，允许用户在完成设置前清除已选的时间

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
