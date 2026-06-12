## ADDED Requirements

### Requirement: 用户可配置自动归档设置

系统应当支持针对每位用户的自动归档设置。用户通过 `UserSetting` API 管理 `AUTO_ARCHIVE` 类型的设置。该设置包含是否启用自动归档以及归档天数。

自动归档设置存储在 `AutoArchiveUserSetting` 消息中：
- `enabled` (bool)：是否启用自动归档，默认 false
- `archive_after_days` (int32)：完成后多少天自动归档，默认 15 天，取值范围 1-365

#### Scenario: 启用自动归档（默认值）

- **WHEN** 用户首次查询 `AUTO_ARCHIVE` 设置且未配置过
- **THEN** 系统返回默认值：`enabled = false`, `archive_after_days = 15`

#### Scenario: 修改自动归档设置为启用

- **WHEN** 用户调用 `UpdateUserSetting` API，将 `AUTO_ARCHIVE` 设置的 `enabled` 设为 `true`
- **THEN** 系统保存该设置，后续自动归档检查会考虑该用户的已完成 memo

#### Scenario: 修改归档天数

- **WHEN** 用户调用 `UpdateUserSetting` API，将 `AUTO_ARCHIVE` 设置的 `archive_after_days` 设为 `7`
- **THEN** 系统保存该设置，已完成 memo 将在 7 天后自动归档

#### Scenario: 修改归档天数超出范围

- **WHEN** 用户调用 `UpdateUserSetting` API，将 `AUTO_ARCHIVE` 设置的 `archive_after_days` 设为 `0` 或 `400`
- **THEN** 系统返回 `INVALID_ARGUMENT` 错误

#### Scenario: 禁用自动归档

- **WHEN** 用户调用 `UpdateUserSetting` API，将 `AUTO_ARCHIVE` 设置的 `enabled` 设为 `false`
- **THEN** 系统保存该设置，用户的已完成 memo 不会再自动归档

### Requirement: 后台定时自动归档已完成 Memo

系统应当定时运行自动归档任务，扫描所有用户的已完成 memo，将符合条件的 memo 转为 `ARCHIVED` 状态。

自动归档任务每天执行一次。对于每位启用了自动归档的用户，查询满足以下所有条件的 memo：
- `row_status = COMPLETED`
- `creator_id = 该用户的 ID`
- `updated_ts < (当前时间 - archive_after_days × 86400 秒)`

将满足条件的 memo 的 `row_status` 更新为 `ARCHIVED`。更新时应当发送正常的 memo updated SSE 事件和 webhook。

#### Scenario: 自动归档符合条件的 memo

- **WHEN** 自动归档任务执行，用户启用了自动归档（7 天），存在该用户创建的 10 天前完成的 memo
- **THEN** 该 memo 的 `row_status` 被更新为 `ARCHIVED`，系统广播 memo updated SSE 事件

#### Scenario: 未达到归档天数

- **WHEN** 自动归档任务执行，用户启用了自动归档（30 天），存在该用户创建的 5 天前完成的 memo
- **THEN** 该 memo 不被处理，`row_status` 保持 `COMPLETED`

#### Scenario: 用户未启用自动归档

- **WHEN** 自动归档任务执行，用户未启用自动归档
- **THEN** 该用户的所有已完成 memo 不被处理

#### Scenario: 自动归档不处理 NORMAL 状态的 memo

- **WHEN** 自动归档任务执行，用户启用了自动归档
- **THEN** 仅处理 `row_status = COMPLETED` 的 memo，`NORMAL` 状态的 memo 不受影响

#### Scenario: 自动归档任务出错时跳过单个用户

- **WHEN** 自动归档任务执行，处理某个用户时出现数据库错误
- **THEN** 系统记录错误日志，继续处理下一个用户

### Requirement: 前端个人设置提供自动归档配置

前端个人设置（Preferences）页面应当提供自动归档配置区域，包含：
- 启用/禁用自动归档的开关
- 归档天数的数字输入（支持范围 1-365）

#### Scenario: 设置页面显示自动归档配置

- **WHEN** 用户打开设置页的 Preferences 部分
- **THEN** 页面展示「自动归档」配置组，包含启用开关和天数输入框

#### Scenario: 用户开启自动归档

- **WHEN** 用户点击自动归档开关到开启状态
- **THEN** 系统保存 `enabled = true` 的 `AUTO_ARCHIVE` 设置并更新 UI 状态

#### Scenario: 用户修改归档天数

- **WHEN** 用户在归档天数输入框中输入 `7`
- **THEN** 系统保存 `archive_after_days = 7` 的 `AUTO_ARCHIVE` 设置
