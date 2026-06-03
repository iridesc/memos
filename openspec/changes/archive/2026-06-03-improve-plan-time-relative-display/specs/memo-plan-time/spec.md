## MODIFIED Requirements

### Requirement: 前端 memo 卡片展示计划时间范围

前端 memo 卡片的 Header 区域应当以三态相对时间格式展示计划时间。仅当 `plan_start_time` 和 `plan_end_time` 均存在时才展示。展示位置在创建时间旁边。

三种展示状态：
- **未开始**（开始时间在未来）：`<time>后开始 · 持续<duration>`
- **进行中**（开始时间在过去，结束时间在未来）：`进行中 · <time>后结束`
- **已过期**（开始和结束均在过去）：`已过期`

时间值使用单一最大单位加一位小数的精度（如 1.5 小时），整数值省略 ".0"。

#### Scenario: 计划时间存在（未开始）

- **WHEN** memo 的 `plan_start_time` 和 `plan_end_time` 均已设置，且 `plan_start_time` 在未来
- **THEN** MemoHeader 中显示「X后开始 · 持续Y」格式，X 和 Y 使用最大时间单位

#### Scenario: 计划时间存在（进行中）

- **WHEN** memo 的 `plan_start_time` 在过去但 `plan_end_time` 在未来
- **THEN** MemoHeader 中显示「进行中 · X后结束」，省略开始距今时间，仅突出剩余时间

#### Scenario: 计划时间存在（已过期）

- **WHEN** memo 的 `plan_start_time` 和 `plan_end_time` 均在过去
- **THEN** MemoHeader 中显示「已过期」，不展示具体时间值——提示用户应手动归档此事项

#### Scenario: 计划时间即将开始

- **WHEN** `plan_start_time` 距离现在不足 60 秒
- **THEN** MemoHeader 中显示「即将开始 · 持续Y」

#### Scenario: 进行中即将结束

- **WHEN** 计划进行中且 `plan_end_time` 距离现在不足 60 秒
- **THEN** MemoHeader 中显示「进行中 · 即将结束」

#### Scenario: 计划时间不存在

- **WHEN** memo 的 `plan_start_time` 和 `plan_end_time` 均为空
- **THEN** MemoHeader 中不显示任何计划时间相关信息

#### Scenario: 小数精度

- **WHEN** 时间差值为 90 分钟（1.5 小时）
- **THEN** 显示「1.5小时后」而非「1小时30分钟后」或「90分钟后」

#### Scenario: 整数省略小数

- **WHEN** 时间差值为 2 小时整
- **THEN** 显示「2小时后」而非「2.0小时后」

#### Scenario: 时间悬停提示

- **WHEN** 用户将鼠标悬停在计划时间显示区域上
- **THEN** 显示 tooltip 包含完整的绝对计划开始和结束时间，作为精确参考
