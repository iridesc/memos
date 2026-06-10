## MODIFIED Requirements

### Requirement: 今日计划截止时间筛选

Today 页面应当筛选 `plan_end_time` 在今天结束之前的 memo。之前筛选的是 `plan_start_time` 在今天范围，现在改为筛选 `plan_end_time` 在今天结束之前，这样前天或昨天过期的任务也会出现在 Today 的过期分组中，方便用户重新安排或标记完成。

#### Scenario: 筛选逻辑

- **WHEN** 用户进入 Today 页面
- **THEN** 系统调用 `ListMemos`，使用 CEL filter `plan_end_ts < tomorrow_0:00`
- **AND** 返回的 memo 包含所有 `plan_end_time` 在今天结束之前的 memo（含已过期的）

#### Scenario: 有 plan_end_time 无 plan_start_time 的 memo

- **WHEN** memo 设置了 `plan_end_time` 但未设置 `plan_start_time`（当前系统不允许）
- **AND** `plan_end_time` 在今天结束之前
- **THEN** 该 memo 仍然出现在 Today 视图中

#### Scenario: 无今天计划

- **WHEN** 当天没有 `plan_end_time` 在今天结束之前的 memo
- **THEN** 页面展示空状态，编辑器和完成区折叠条均不展示

### Requirement: 计划截止时间排序

Today 页面的 memo 列表应当固定按 `plan_end_time` 升序排列，服务端 `orderBy` 使用 `plan_end_time asc`。客户端 `listSort` 对过期组按 `plan_end_time ASC` 排序，活跃组按 `plan_start_time ASC` 排序。

#### Scenario: 服务端排序

- **WHEN** 用户进入 Today 页面
- **THEN** 服务端使用 `orderBy: "plan_end_time asc"` 拉取数据

#### Scenario: 客户端过期分组排序

- **WHEN** 客户端渲染 Today 列表时
- **THEN** 已过期 memo（`planEndTime < now`）排在前面，内部按 `plan_end_time ASC` 排列（过期最久的在最前）

#### Scenario: 客户端活跃分组排序

- **WHEN** 客户端渲染 Today 列表时
- **THEN** 未过期 memo（`planEndTime >= now`）排在过期组后面，内部按 `plan_start_time ASC` 排列（马上要开始的在最前面）

#### Scenario: 不受全局排序设置影响

- **WHEN** 用户在 ViewContext 中切换 `timeBasis`
- **THEN** Today 页面的排序不受影响，仍使用 `plan_end_time asc`