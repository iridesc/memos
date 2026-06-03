# Plan Time Relative Display

## Purpose

将 memo 卡片的计划时间以三态相对时间格式展示，替代原有的绝对日期时间格式。同时移除卡片上的创建/更新时间文字，减少视觉冗余。

## Requirements

### Requirement: Plan time displayed with three-state relative format

系统应当将 memo 计划时间分为三种状态并分别展示：

| 状态 | 条件 | 展示格式 |
|------|------|---------|
| 未开始 | `plan_start_time` 在未来 | `{{time}}后开始 · 持续{{duration}}` |
| 进行中 | `plan_start_time` 在过去，`plan_end_time` 在未来 | `进行中 · {{time}}后结束` |
| 已过期 | 两者均在过去 | `已过期` |

系统应当使用单一最大时间单位加一位小数精度（如 "1.5小时后"、"30分钟后"）。

时间单位阈值：
- 0–59 分钟：使用整数分钟
- 60 分钟 – 23.9 小时：使用小时，最多 1 位小数
- 24 小时 – 29.9 天：使用天，最多 1 位小数
- ≥ 30 天：使用月，最多 1 位小数

系统应当对整数值省略末尾 ".0"（如 "2.0小时后" → "2小时后"）。

系统应当支持所有展示文本的国际化。

#### Scenario: 计划未开始（未来）

- **WHEN** memo 的 `plan_start_time` 和 `plan_end_time` 均已设置，且 `plan_start_time` 在未来
- **THEN** MemoHeader 显示「{{time}}后开始 · 持续{{duration}}」，使用单一最大单位加可选小数

#### Scenario: 计划进行中（已开始但未结束）

- **WHEN** memo 的 `plan_start_time` 在过去而 `plan_end_time` 在未来
- **THEN** MemoHeader 显示「进行中 · {{time}}后结束」，展示剩余时间，省略开始距今时间

#### Scenario: 计划已过期（均在过去）

- **WHEN** memo 的 `plan_start_time` 和 `plan_end_time` 均在过去
- **THEN** MemoHeader 显示「已过期」（或等价文本），不展示具体时间值——提示事项需要手动归档

#### Scenario: 计划即将开始（不足 60 秒）

- **WHEN** memo 的 `plan_start_time` 在未来不足 60 秒（未开始状态）
- **THEN** MemoHeader 显示「即将开始 · 持续{{duration}}」（或等价文本）

#### Scenario: 进行中即将结束（不足 60 秒）

- **WHEN** 计划进行中且 `plan_end_time` 在未来不足 60 秒
- **THEN** MemoHeader 显示「进行中 · 即将结束」（或等价文本）

#### Scenario: 计划时间未设置

- **WHEN** memo 没有设置 `plan_start_time` 或 `plan_end_time`
- **THEN** MemoHeader 不显示任何计划时间信息

#### Scenario: 小数精度

- **WHEN** 时间差值为 90 分钟
- **THEN** 显示「1.5小时」而非「1小时30分钟」或「90分钟」

#### Scenario: 整数省略小数

- **WHEN** 时间差值为 2 小时整（120 分钟）
- **THEN** 显示「2小时」而非「2.0小时」

### Requirement: Creation/update time removed from card display

系统不应当在 memo 卡片 Header 上展示创建时间或更新时间文字。memo 卡片 Header 应当仅展示：
- Creator 头像和名称（当启用时）
- 计划时间（当设置时，以相对格式展示）

所有精确时间戳（创建、更新、计划开始、计划结束）应当通过 hover tooltip 可访问。

#### Scenario: 有计划时间的 memo

- **WHEN** memo 设置了计划时间
- **THEN** 卡片 Header 展示 creator（若启用）和相对计划时间；不展示创建时间文字

#### Scenario: 无计划时间的 memo

- **WHEN** memo 未设置计划时间
- **THEN** 卡片 Header 仅展示 creator（若启用）；无时间文字可见

### Requirement: Absolute times preserved in tooltip

系统应当继续在 hover tooltip 中展示绝对计划开始和结束时间，格式为完整本地化日期时间字符串。

#### Scenario: Hover tooltip 展示绝对时间

- **WHEN** 用户将鼠标悬停在相对计划时间显示区域上
- **THEN** tooltip 展示精确的计划开始和计划结束日期时间