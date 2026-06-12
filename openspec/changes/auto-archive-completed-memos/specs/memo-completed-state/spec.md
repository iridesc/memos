## MODIFIED Requirements

### Requirement: Memo 具备可选的完成状态

系统应当支持 memo 的 `row_status` 为 `COMPLETED` 状态，形成 NORMAL → COMPLETED → ARCHIVED 三态流转。`COMPLETED` 表示 memo 已完成但尚未归档。

状态转换规则：
- NORMAL → COMPLETED：用户勾选完成
- COMPLETED → NORMAL：用户取消勾选
- NORMAL/COMPLETED → ARCHIVED：用户归档，或自动归档定时任务触发归档
- ARCHIVED → NORMAL：用户恢复（不回到 COMPLETED）

#### Scenario: 标记 memo 为完成

- **WHEN** 创建者调用 `UpdateMemo` API 并设置 `update_mask` 包含 `state`，`state` 为 `COMPLETED`
- **THEN** 系统将该 memo 的 `row_status` 更新为 `COMPLETED`

#### Scenario: 取消完成标记

- **WHEN** 创建者调用 `UpdateMemo` API 并设置 `update_mask` 包含 `state`，`state` 为 `NORMAL`（从 COMPLETED 恢复）
- **THEN** 系统将该 memo 的 `row_status` 更新为 `NORMAL`

#### Scenario: 归档已完成 memo

- **WHEN** 创建者将 COMPLETED 状态的 memo 归档（`state` 设为 `ARCHIVED`），或自动归档定时任务对符合条件的 COMPLETED memo 执行归档
- **THEN** 系统将该 memo 的 `row_status` 更新为 `ARCHIVED`

#### Scenario: 恢复已归档 memo

- **WHEN** 创建者将 ARCHIVED 状态的 memo 恢复（`state` 设为 `NORMAL`）
- **THEN** 系统将该 memo 的 `row_status` 更新为 `NORMAL`（回到 NORMAL 而非 COMPLETED）

#### Scenario: 非创建者无法变更完成状态

- **WHEN** 非创建者调用 `UpdateMemo` API 尝试修改 `state`
- **THEN** 系统返回 `PERMISSION_DENIED` 错误

## REMOVED Requirements

### Requirement: 归档已完成 memo（旧版）

**Reason**: 该需求已更新为支持自动归档，见上面 MODIFIED 版本的 Scenario

**Migration**: 无迁移需求，手动归档功能仍然可用，自动归档作为补充
