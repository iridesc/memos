## MODIFIED Requirements

### Requirement: Plan time displayed with three-state relative format

系统应当将 memo 计划时间分为三种状态并分别展示：

| 状态 | 条件 | 展示格式 | 样式 |
|------|------|---------|------|
| 未开始 | `plan_start_time` 在未来 | `{{time}}后开始 · 持续{{duration}}` | `text-muted-foreground` |
| 进行中 | `plan_start_time` 在过去，`plan_end_time` 在未来 | `进行中 · {{time}}后结束` | `text-muted-foreground` |
| 已过期 | 两者均在过去 | `已过期` | `font-bold text-destructive` |

已过期状态的文本 SHALL 使用加粗字体（`font-bold`）和醒目颜色（`text-destructive`），以区别于未开始和进行中状态。

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
- **THEN** MemoHeader 以加粗（`font-bold`）和醒目颜色（`text-destructive`）显示「已过期」（或等价文本），不展示具体时间值

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
