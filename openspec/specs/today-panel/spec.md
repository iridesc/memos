# Today Panel

## Purpose

侧边栏第一位的「今天」聚焦面板，展示计划开始时间在今日的所有 memo，支持拖拽排序和快捷录入。

## Requirements

### Requirement: 侧边栏 Today 导航

系统应当在侧边栏第一位展示「今天」导航项，图标为日历，点击进入 `/today` 页面。

#### Scenario: Today 导航可见

- **WHEN** 用户处于已登录状态
- **THEN** 侧边栏第一项展示「今天」导航，带日历图标

#### Scenario: 未登录也可访问

- **WHEN** 用户未登录
- **THEN** 侧边栏仍展示「今天」导航，Today 页面展示所有公开 memo

### Requirement: 今日计划时间筛选

Today 页面应当仅筛选 `plan_start_time` 在今天的 memo。`plan_end_time` 不作为筛选条件，保证每条出现在今日视图的 memo 都有 plan_start_time。

#### Scenario: 筛选逻辑

- **WHEN** 用户进入 Today 页面
- **THEN** 系统调用 `ListMemos`，使用 CEL filter `plan_start_ts >= today_0:00 && plan_start_ts < tomorrow_0:00`

#### Scenario: 无今日计划

- **WHEN** 当天没有匹配的计划 memo
- **THEN** 页面展示空状态，编辑器和完成区折叠条均不展示

### Requirement: 计划时间排序

Today 页面的 memo 列表应当固定按 `plan_start_time` 升序排列，不受全局视图排序设置影响。这是拖拽排序正确工作的前提——拖拽修改 plan_start_time 后 memo 自然会停留在新位置。

#### Scenario: 排序规则

- **WHEN** 用户进入 Today 页面
- **THEN** 服务端使用 `orderBy: "plan_start_time asc"` 拉取数据
- **AND** 客户端按 `plan_start_time` 升序排列，不依赖全局 `timeBasis` 设置

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