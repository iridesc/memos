## ADDED Requirements

### Requirement: 已完成 memo 展示完成时间

系统应当在已完成 memo 的卡片头部展示完成时间。在 memo 被标记为 `COMPLETED` 后，「已完成」绿色标签旁应显示 memo 的完成时间（以 `updateTime` 作为近似值）。

#### Scenario: 已完成 memo 显示完成时间

- **WHEN** memo 状态为 `COMPLETED` 且有计划时间（`planStartTime` 和 `planEndTime` 均存在）
- **THEN** memo 卡片头部展示绿色「已完成」标签，后跟 memo 的 `updateTime` 日期（如 `6/26`）

#### Scenario: 已完成 memo 无计划时间

- **WHEN** memo 状态为 `COMPLETED` 但无计划时间（`planStartTime` 或 `planEndTime` 缺失）
- **THEN** memo 卡片头部不额外展示完成状态和时间（保持原样）

#### Scenario: 未完成 memo 不展示完成时间

- **WHEN** memo 状态为 `NORMAL` 且有计划时间
- **THEN** memo 卡片头部展示相对计划时间（如「3 小时后」），不展示完成时间

### Requirement: 已完成 memo 按完成时间排序

系统应当在已完成折叠区中对已完成 memo 按完成时间降序排列（最近完成的在上面）。排序依据 memo 的 `updateTime`，与活跃区排序模式无关。

#### Scenario: 多个已完成 memo 按完成时间排序

- **WHEN** 列表中存在多个 `state = COMPLETED` 的 memo，完成时间各不相同
- **THEN** 已完成折叠区中的 memo 按 `updateTime` 降序排列，最近完成的排在最前

#### Scenario: 切换活跃区排序不影响已完成区

- **WHEN** 用户切换活跃区排序模式（如按创建时间/更新时间/计划时间排序）
- **THEN** 已完成折叠区中的 memo 始终按 `updateTime` 降序排列，不受活跃区排序模式影响
