## Context

Memos 当前为 memo 存储两个时间戳：`created_ts` 和 `updated_ts`（均为 BIGINT unix 秒）。这两个字段存在于数据库独立列、store 结构体和 API proto 消息中。前端的 memo 卡片在 `MemoHeader` 组件左上角展示其中一项（由用户偏好决定展示创建时间还是更新时间）。

用户希望额外增加「计划时间」维度：计划开始时间和计划结束时间，均为可选。存储方案选择独立数据库列（跟随 `created_ts`/`updated_ts` 模式），因为存在按计划时间排序的需求，JSON 列内字段无法高效支持跨数据库引擎的排序查询。

## Goals / Non-Goals

**Goals:**
- memo 支持可选的 `plan_start_time` 和 `plan_end_time` 字段
- 数据库层、store 层、API 层、前端层全链路贯通
- 支持 `order_by=plan_start_time` 和 `order_by=plan_end_time` 排序
- 前端 memo 卡片在存在计划时间时展示时间范围
- 前端编辑器支持设置计划时间
- 前端排序 UI 支持选择计划时间字段

**Non-Goals:**
- 不提供基于计划时间的过滤（filter），仅排序
- 不提供日历视图或甘特图
- 不提供计划时间提醒/通知
- 不提供重复计划（recurring）
- 不涉及备忘录之间的计划时间依赖关系

## Decisions

### 1. 存储方案：独立数据库列而非 payload JSON

**选择**：`plan_start_ts BIGINT DEFAULT NULL` + `plan_end_ts BIGINT DEFAULT NULL`

**理由**：
- 用户确认有排序需求，独立列可在所有三个数据库引擎上高效执行 `ORDER BY plan_start_ts`
- JSON 列内字段排序在 SQLite（`json_extract`）、PostgreSQL（`->>`）、MySQL（`JSON_EXTRACT`）之间语法不一致且无法利用索引
- 与 `created_ts`/`updated_ts` 的现有模式完全一致，降低认知负担和实现风险
- `ALTER TABLE ADD COLUMN ... DEFAULT NULL` 对三个数据库引擎均为轻量操作

**替代方案**：存储在 `payload` JSON 列中（跟随 Location 模式）
- 优点：不需要 migration
- 缺点：排序效率低，跨引擎语法差异大，与 `created_ts`/`updated_ts` 模式不一致
- 否决理由：已知有排序需求

### 2. 数据类型：BIGINT unix 时间戳

**选择**：BIGINT（int64 unix 秒），Go 侧使用 `*int64` 指针（nil = 未设置）

**理由**：
- SQLite 和 PostgreSQL 已使用 BIGINT 存储 `created_ts`/`updated_ts`
- Go 侧 `*int64` 指针语义与 `UpdateMemo` 的部分更新模式一致（nil = 不更新）
- Proto 侧使用 `google.protobuf.Timestamp`，通过 `timestamppb.New()` / `.AsTime().Unix()` 转换

**注意**：MySQL 当前使用 `TIMESTAMP` 类型存储 `created_ts`/`updated_ts`，但新字段统一使用 BIGINT 以保持跨引擎一致性，避免 MySQL TIMESTAMP 的 2038 年问题和时区行为差异。

### 3. Proto 字段编号

**选择**：field 19 (`plan_start_time`) 和 field 20 (`plan_end_time`)

**理由**：
- Memo 消息当前最大 field number 为 18 (`location`)，19 和 20 是下一个可用编号
- field 6 已被 `display_time` 占用并 reserved，不可复用
- 两个字段使用连续的编号，逻辑清晰

### 4. 排序集成

**选择**：扩展 `FindMemo` 结构体新增 `OrderByPlanStart` 和 `OrderByPlanEnd` 布尔字段

**理由**：
- 与现有 `OrderByPinned` / `OrderByUpdatedTs` 模式一致
- `parseMemoOrderBy` 中新增 `"plan_start_time"` 和 `"plan_end_time"` case 分支
- 三个数据库 driver 的 ORDER BY 构建逻辑一致增加对应分支
- 与现有时间字段互斥（同一查询只能按一种时间排序），优先级：先到先得

**ORDER BY 规则**：
- 如果 `OrderByPlanStart = true`：`ORDER BY plan_start_ts {ASC|DESC}, id DESC`
- 如果 `OrderByPlanEnd = true`：`ORDER BY plan_end_ts {ASC|DESC}, id DESC`
- 如果 `OrderByPinned = true`：pinned DESC 始终排在最前面

### 5. 前端排序字段重构

**选择**：将现有 `timeBasis`（二选一：create_time/update_time）重构为 `sortTimeField`（四选一：create_time/update_time/plan_start_time/plan_end_time）

**理由**：
- 当前 `timeBasis` 同时控制「卡片展示哪个时间」和「按哪个时间排序」，这两个关注点应当解耦
- `timeBasis` 继续控制卡片展示时间；新增独立的 `sortTimeField` 控制排序字段
- 排序下拉从二选一变为四选一，UI 从两个独立 toggle 改为单个字段选择器

## Risks / Trade-offs

| 风险 / 权衡 | 影响 | 缓解措施 |
|---|---|---|
| MySQL TIMESTAMP vs BIGINT 不一致 | MySQL 的 `created_ts` 是 TIMESTAMP，新字段用 BIGINT，可能引起困惑 | 文档注释说明。长期可考虑统一 MySQL 列类型 |
| 三个 driver migration 文件维护 | 新增 migration 需为三个 engine 各写一份 | 模式简单（仅 `ALTER TABLE ADD COLUMN`），差异仅限于 SQL 方言 |
| 前端排序状态迁移 | `ViewContext` 中 localStorage 的 `sortTimeField` 键可能冲突 | 旧键 `sortTimeField` 已在代码中存在（兼容层），新值用不同字符串区分 |
| `buf generate` 重新生成类型 | Proto 变更后前端 TypeScript 类型需重新生成 | 作为 tasks 中独立一步，确保生成成功后再写前端代码 |

## Migration Plan

1. 后端先行：先完成 proto 定义、migration、store 层、API 层变更
2. 运行 `buf generate` 生成新的 Go 和 TypeScript 类型
3. 前端适配：在生成的类型基础上实现 UI
4. 部署：标准 Docker 镜像构建和发布流程
5. 回滚：新列为 `DEFAULT NULL` 且所有访问使用指针/可选类型，回滚后旧代码忽略未知列即可正常运行

## Open Questions

<!-- 无未解决问题——所有关键决策已在探索阶段确认 -->
