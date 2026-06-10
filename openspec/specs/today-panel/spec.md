# Today Panel

## Purpose

侧边栏第一位的「今天」聚焦面板，展示时间区间与今天有重叠的所有 memo（含跨天和已过期任务），支持拖拽排序和快捷录入。

## Requirements

### Requirement: 侧边栏 Today 导航

系统应当在侧边栏第一位展示「今天」导航项，图标为日历，点击进入 `/today` 页面。

#### Scenario: Today 导航可见

- **WHEN** 用户处于已登录状态
- **THEN** 侧边栏第一项展示「今天」导航，带日历图标

#### Scenario: 未登录也可访问

- **WHEN** 用户未登录
- **THEN** 侧边栏仍展示「今天」导航，Today 页面展示所有公开 memo

### Requirement: 今日计划筛选

Today 页面应当筛选时间区间与今天有重叠的 memo（plan_start 在明天之前且 plan_end 在今天之后），这样既包含今天开始的短任务，也包含跨天正在进行的任务。

#### Scenario: 筛选逻辑

- **WHEN** 用户进入 Today 页面
- **THEN** 系统调用 `ListMemos`，使用 CEL filter `plan_start_ts < tomorrow_0:00 && plan_end_ts >= today_0:00`
- **AND** 返回的 memo 包含时间区间与今天有重叠的所有 memo（含已过期的和跨天的）

#### Scenario: 有 plan_end_time 无 plan_start_time 的 memo

- **WHEN** memo 设置了 `plan_end_time` 但未设置 `plan_start_time`（当前系统不允许）
- **AND** `plan_end_time` 在今天结束之前
- **THEN** 该 memo 仍然出现在 Today 视图中

#### Scenario: 无今日计划

- **WHEN** 当天没有时间区间与今天重叠的 memo
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

### Requirement: Today 页面无侧边栏浏览区

Today 页面不应当展示侧边栏的日历、捷径和标签区块，仅保留导航和创建编辑器。

#### Scenario: 侧边栏简化

- **WHEN** 用户进入 `/today` 页面
- **THEN** 侧边栏仅展示导航项，不展示日历/捷径/标签区块
- **AND** 列表上方不展示 MemoFilters 筛选栏

### Requirement: 计划时间自动填充

Today 页面的编辑器应当自动为新建 memo 预填计划时间。

#### Scenario: 首次录入

- **WHEN** 用户在 Today 页面创建第一条 memo
- **THEN** 编辑器自动填充 plan_start_time 为当前时间 +5 分钟取整，plan_end_time 为当天 23:55 或次日 23:55

#### Scenario: 连续录入

- **WHEN** 用户在 Today 页面创建第二条及后续 memo
- **THEN** 编辑器每次都重新计算并填充计划时间

### Requirement: 拖拽排序

Today 页面的活跃 memo 卡片应当支持拖拽排序。拖动 memo 到新位置时，系统自动计算并更新该 memo 的 plan_start_time，持续时间不变。

#### Scenario: 拖到两项之间

- **WHEN** 用户拖拽 memo B 放到 memo A 和 memo C 之间
- **THEN** B 的 plan_start_time 设为 (A 的开始时间 + C 的开始时间) / 2，plan_end_time 同步偏移

#### Scenario: 拖到最上方

- **WHEN** 用户拖拽 memo B 放到列表最顶部（第一个任务 A 之前）
- **THEN** B 的 plan_start_time 设为 A 的开始时间 - 5 分钟

#### Scenario: 拖到最下方

- **WHEN** 用户拖拽 memo B 放到列表最底部
- **THEN** B 的 plan_start_time 设为上一项的 plan_start_time + 30 分钟

#### Scenario: 已完成的 memo 不可拖拽

- **WHEN** memo 状态为 COMPLETED
- **THEN** 该 memo 卡片不可拖拽

### Requirement: 更新时允许过去的计划开始时间

系统应当在 UpdateMemo 中允许 plan_start_time 为过去的时间，以支持拖拽排序到已有过去任务的场景。CreateMemo 仍拒绝过去的开始时间。

#### Scenario: Create 拒绝过去时间

- **WHEN** 用户创建 memo 并设置 plan_start_time 在过去
- **THEN** 系统返回 `InvalidArgument` 错误

#### Scenario: Update 允许过去时间

- **WHEN** 用户拖拽排序将 memo 的 plan_start_time 设为过去
- **THEN** 系统正常更新，不拒绝