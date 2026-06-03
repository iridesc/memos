# Memo Completed State

## Purpose

为 memo 增加 COMPLETED 状态，形成 NORMAL → COMPLETED → ARCHIVED 三态流转。已完成 memo 在列表底部折叠区展示，有计划时间的 memo 卡片提供完成勾选框。

## Requirements

### Requirement: Memo 具备可选的完成状态

系统应当支持 memo 的 `row_status` 为 `COMPLETED` 状态，形成 NORMAL → COMPLETED → ARCHIVED 三态流转。`COMPLETED` 表示 memo 已完成但尚未归档。

状态转换规则：
- NORMAL → COMPLETED：用户勾选完成
- COMPLETED → NORMAL：用户取消勾选
- NORMAL/COMPLETED → ARCHIVED：用户归档
- ARCHIVED → NORMAL：用户恢复（不回到 COMPLETED）

#### Scenario: 标记 memo 为完成

- **WHEN** 创建者调用 `UpdateMemo` API 并设置 `update_mask` 包含 `state`，`state` 为 `COMPLETED`
- **THEN** 系统将该 memo 的 `row_status` 更新为 `COMPLETED`

#### Scenario: 取消完成标记

- **WHEN** 创建者调用 `UpdateMemo` API 并设置 `update_mask` 包含 `state`，`state` 为 `NORMAL`（从 COMPLETED 恢复）
- **THEN** 系统将该 memo 的 `row_status` 更新为 `NORMAL`

#### Scenario: 归档已完成 memo

- **WHEN** 创建者将 COMPLETED 状态的 memo 归档（`state` 设为 `ARCHIVED`）
- **THEN** 系统将该 memo 的 `row_status` 更新为 `ARCHIVED`

#### Scenario: 恢复已归档 memo

- **WHEN** 创建者将 ARCHIVED 状态的 memo 恢复（`state` 设为 `NORMAL`）
- **THEN** 系统将该 memo 的 `row_status` 更新为 `NORMAL`（回到 NORMAL 而非 COMPLETED）

#### Scenario: 非创建者无法变更完成状态

- **WHEN** 非创建者调用 `UpdateMemo` API 尝试修改 `state`
- **THEN** 系统返回 `PERMISSION_DENIED` 错误

### Requirement: ListMemos 默认同时返回未完成和已完成 memo

系统应当默认同时返回 `row_status` 为 `NORMAL` 和 `COMPLETED` 的 memo。当 `state` 参数未设置或设为 `NORMAL` 时，同时返回两种状态的 memo。当显式设为 `COMPLETED` 时，仅返回已完成 memo。当设为 `ARCHIVED` 时，行为不变（仅返回已归档 memo）。

#### Scenario: 默认列表包含已完成 memo

- **WHEN** 用户调用 `ListMemos` 且未设置 `state` 参数（或设为 `NORMAL`）
- **THEN** 系统返回 `row_status` 为 `NORMAL` 和 `COMPLETED` 的 memo，按指定排序规则排列

#### Scenario: 仅查询已完成 memo

- **WHEN** 用户调用 `ListMemos` 并设置 `state = COMPLETED`
- **THEN** 系统仅返回 `row_status` 为 `COMPLETED` 的 memo

#### Scenario: 统计 API 包含已完成 memo

- **WHEN** 用户调用 `GetUserStats` 或 `ListAllUserStats`（`state = NORMAL`）
- **THEN** 系统统计 `row_status` 为 `NORMAL` 和 `COMPLETED` 的 memo，已完成 memo 的标签和统计数据包含在结果中

### Requirement: 前端 memo 列表底部展示已完成折叠区

前端 memo 列表应当将 memo 按状态分为活跃区和已完成区：
- 活跃区：展示 `state = NORMAL` 的 memo
- 已完成区：展示 `state = COMPLETED` 的 memo，默认折叠收起

已完成区应当使用与活跃区相同的排序规则和筛选条件。折叠状态应当持久化到 localStorage。

#### Scenario: 列表中有已完成 memo

- **WHEN** 当前列表中存在 `state = COMPLETED` 的 memo
- **THEN** 列表底部显示折叠条「已完成 (N)」，默认收起。点击展开后显示已完成 memo，排序和筛选条件与活跃区一致

#### Scenario: 列表中无已完成 memo

- **WHEN** 当前列表中不存在 `state = COMPLETED` 的 memo
- **THEN** 列表底部不展示已完成折叠区

#### Scenario: 折叠状态切换

- **WHEN** 用户点击折叠条展开已完成区
- **THEN** 折叠条变为「收起」状态，已完成 memo 展开显示，折叠偏好持久化到 localStorage

#### Scenario: 取消完成后 memo 回到活跃区

- **WHEN** 用户在已完成区取消勾选某个 memo
- **THEN** 该 memo 立即从已完成区移除，回到活跃区

### Requirement: 有计划时间的 memo 卡片展示完成勾选框

仅有计划时间（`plan_start_time` 和 `plan_end_time` 均存在）且 `state = NORMAL` 的 memo 卡片右下角应当展示完成勾选框。点击即可将 memo 标记为完成。`state = COMPLETED` 的 memo 卡片展示已勾选状态，可取消勾选。

#### Scenario: 有计划时间且未完成

- **WHEN** memo 的 `plan_start_time` 和 `plan_end_time` 均设置，且 `state = NORMAL`
- **THEN** memo 卡片右下角展示空心勾选框，点击后 memo 标记为 COMPLETED

#### Scenario: 有计划时间且已完成

- **WHEN** memo 的 `plan_start_time` 和 `plan_end_time` 均设置，且 `state = COMPLETED`
- **THEN** memo 卡片右下角展示实心勾选框，点击后取消完成，memo 回到 NORMAL

#### Scenario: 无计划时间

- **WHEN** memo 的 `plan_start_time` 或 `plan_end_time` 未设置
- **THEN** memo 卡片右下角不展示勾选框

#### Scenario: 已归档 memo

- **WHEN** memo 的 `state = ARCHIVED`
- **THEN** memo 卡片右下角不展示勾选框（归档 memo 不可交互）