## ADDED Requirements

### Requirement: MCP memo 响应包含计划时间和完成状态

MCP 工具（`list_memos`、`get_memo`、`search_memos`、`list_memo_comments`）返回的 memo JSON 响应中，应当包含 `plan_start_time` 和 `plan_end_time` 两个可选字段。当 memo 设置了计划时间时，以 Unix 时间戳秒数返回；未设置时 JSON 中省略该字段。

`state` 字段应当正确映射 `COMPLETED` 状态，与 `NORMAL`、`ARCHIVED` 并列。

#### Scenario: 读取有计划时间的 memo

- **WHEN** AI 通过 `get_memo` 或 `list_memos` 获取一个设置了 `plan_start_time` 和 `plan_end_time` 的 memo
- **THEN** 返回的 JSON 中包含 `"plan_start_time": <seconds>` 和 `"plan_end_time": <seconds>` 字段

#### Scenario: 读取无计划时间的 memo

- **WHEN** AI 获取一个未设置计划时间的 memo
- **THEN** 返回的 JSON 中不含 `plan_start_time` 和 `plan_end_time` 字段

#### Scenario: 读取已完成状态

- **WHEN** AI 获取一个 `row_status = COMPLETED` 的 memo
- **THEN** 返回的 JSON 中 `"state": "COMPLETED"`

#### Scenario: 读取已归档状态（不变）

- **WHEN** AI 获取一个 `row_status = ARCHIVED` 的 memo
- **THEN** 返回的 JSON 中 `"state": "ARCHIVED"`

### Requirement: create_memo 支持设置计划时间

`create_memo` 工具应当接受两个可选参数 `plan_start_time` 和 `plan_end_time`，类型为 number（Unix 时间戳秒数）。两者必须同时提供或同时省略。验证规则与 REST API 一致。

#### Scenario: 创建带计划时间的 memo

- **WHEN** AI 调用 `create_memo` 并同时传入 `plan_start_time` 和 `plan_end_time`（均为未来时间戳）
- **THEN** 系统创建 memo 并存储两个计划时间字段，返回的 memoJSON 中包含这两个字段

#### Scenario: 创建不带计划时间的 memo（向后兼容）

- **WHEN** AI 调用 `create_memo` 且不传入 `plan_start_time` 和 `plan_end_time`
- **THEN** 系统正常创建 memo，返回的 memoJSON 中不含这两个字段

#### Scenario: 仅传一个计划时间被拒绝

- **WHEN** AI 调用 `create_memo` 但只传入 `plan_start_time` 而未传入 `plan_end_time`
- **THEN** 系统返回错误，提示两者必须同时设置

#### Scenario: 创建时计划时间在过去被拒绝

- **WHEN** AI 调用 `create_memo` 且 `plan_start_time` 为过去的时间戳
- **THEN** 系统返回错误，提示计划开始时间不能在过去

#### Scenario: 结束时间早于开始时间被拒绝

- **WHEN** AI 调用 `create_memo` 且 `plan_end_time` 早于 `plan_start_time`
- **THEN** 系统返回错误，提示结束时间必须大于或等于开始时间

### Requirement: update_memo 支持更新计划时间和完成状态

`update_memo` 工具应当接受两个可选参数 `plan_start_time` 和 `plan_end_time`，类型为 number（Unix 时间戳秒数）。允许单独传一个（即仅更新开始或仅更新结束）。同时允许将 `state` 设为 `COMPLETED` 来标记完成。更新时的验证规则与 REST API 一致（允许过去的开始时间）。

#### Scenario: 更新 memo 的计划时间

- **WHEN** AI 调用 `update_memo` 并传入 `plan_start_time` 和 `plan_end_time` 为新值
- **THEN** 系统更新该 memo 的两个计划时间字段

#### Scenario: 清除计划时间

- **WHEN** AI 调用 `update_memo` 并传入 `plan_start_time: 0` 和 `plan_end_time: 0`
- **THEN** 系统将该 memo 的 `plan_start_time` 和 `plan_end_time` 同时清空为 NULL

#### Scenario: 标记 memo 为完成

- **WHEN** AI 调用 `update_memo` 并传入 `state: "COMPLETED"`
- **THEN** 系统将该 memo 的 `row_status` 更新为 `COMPLETED`

#### Scenario: 更新时允许过去的开始时间

- **WHEN** AI 调用 `update_memo` 并传入过去的 `plan_start_time`
- **THEN** 系统正常更新，不拒绝（与拖拽排序行为一致）

#### Scenario: 更新时结束时间早于开始时间被拒绝

- **WHEN** AI 调用 `update_memo` 且 `plan_end_time` 早于 `plan_start_time`（两者均传入时）
- **THEN** 系统返回错误，提示结束时间必须大于或等于开始时间
