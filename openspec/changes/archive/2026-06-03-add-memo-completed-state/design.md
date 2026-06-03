## Context

当前 `memo` 表 `row_status` 列仅有 `NORMAL` 和 `ARCHIVED` 两个值。归档机制用于隐藏 memo（创建者专属可见），但无法表达「已完成但想在列表中看到」的状态。本变更在 NORMAL 和 ARCHIVED 之间插入 COMPLETED 状态，形成 NORMAL → COMPLETED → ARCHIVED 三态流转。

已完成计划时间相对展示（`improve-plan-time-relative-display`）和移除创建时间展示的改动，本变更在此基础上叠加。

## Goals / Non-Goals

**Goals:**
- 新增 `COMPLETED` 状态，形成 NORMAL/COMPLETED/ARCHIVED 三态
- 有计划时间的 memo 卡片右下角展示完成勾选框
- 列表底部展示「已完成」折叠区，默认收起
- 已完成区排序/筛选与活跃区一致
- 已完成 memo 可取消勾选回归 NORMAL

**Non-Goals:**
- 不新增独立 API 端点（完全复用现有 `UpdateMemo` 机制）
- 不修改 memo 创建/删除逻辑
- 不改变归档（ARCHIVED）的现有行为
- 不引入新的数据库字段（复用 `row_status` 列）

## Decisions

### Decision 1: 复用 `row_status` 列 vs 新增 `completed` 列

**选择**: 复用 `row_status` 列，新增 `COMPLETED` 枚举值。

**理由**: COMPLETED 与 ARCHIVED 是互斥的状态——一个 memo 不能同时是「已完成」和「已归档」。用同一列表达状态机的不同状态比用两个独立列更清晰，避免了 `completed` + `archived` 组合爆炸（4 种组合中只有 3 种合法）。同时复用现有的 `state` proto 字段和 `updateMask` 机制，无需新增 API。

**替代方案**: 新增 `completed BOOLEAN` 列 → 需要新字段定义、新 proto 字段、新 API 逻辑，改动面更大。且 `completed=true` + `archived=true` 的语义不明确。

### Decision 2: ListMemos 默认行为

**选择**: 默认 `state=NORMAL` 时同时返回 `row_status IN ('NORMAL', 'COMPLETED')`。

**理由**: 单次请求获取全部活跃 memo，避免前端两次请求。前端按 `state` 分组后，活跃区在上、已完成区在下（折叠），排序/筛选条件一致。如果前端需要单独获取已完成列表，可显式传 `state=COMPLETED`。

**替代方案**: 默认只返回 NORMAL，COMPLETED 需单独请求 → 前端需要两次 API 调用，同一排序/筛选条件需要发送两次，浪费带宽。

### Decision 3: 状态转换规则

```
NORMAL ──→ COMPLETED   (勾选完成，仅创建者)
NORMAL ──→ ARCHIVED    (归档，仅创建者)
COMPLETED ──→ NORMAL   (取消勾选，仅创建者)
COMPLETED ──→ ARCHIVED  (归档，仅创建者)
ARCHIVED ──→ NORMAL     (恢复，仅创建者)
ARCHIVED ──→ COMPLETED  (不支持——恢复后回到 NORMAL)
```

**理由**: 保持状态机简单。从 ARCHIVED 恢复时总是回到 NORMAL，避免用户困惑（「我归档了一个已完成的任务，恢复后它还是已完成？」）。

### Decision 4: 勾选框展示条件

**选择**: 仅在**有计划时间 (`plan_start_time` 和 `plan_end_time` 均存在)**的 memo 上显示勾选框，且仅在 `state=NORMAL` 时显示。

**理由**: 勾选框的语义是「完成这个 todo 任务」。没有计划时间的 memo 更像普通笔记，不应该有「完成」的概念。COMPLETED 状态的 memo 已展示勾选框为选中状态，可取消勾选。

### Decision 5: 列表分组策略

**选择**: 前端侧分组，后端不做特殊处理。

**具体方案**:
```
PagedMemoList 接收 memo 列表后:

1. 按 state 分为 activeMemos (NORMAL) 和 completedMemos (COMPLETED)
2. 两者使用相同的排序逻辑（sort 函数复用）
3. 渲染顺序: activeMemos 在前 → 折叠分隔条 → completedMemos（折叠内）
4. 折叠状态用 localStorage 持久化
```

**理由**: 后端保持简单，前端灵活。分组逻辑纯前端，不增加 API 复杂度。如果后续需要分页优化，可以改为后端分组。

### Decision 6: 数据库迁移

**选择**: 为每个数据库驱动创建增量 migration，将 CHECK 约束从 `('NORMAL','ARCHIVED')` 改为 `('NORMAL','COMPLETED','ARCHIVED')`。`LATEST.sql` 同步更新。

**迁移策略**:
```sql
-- SQLite
ALTER TABLE memo RENAME TO memo_old;
CREATE TABLE memo (..., CHECK (row_status IN ('NORMAL','COMPLETED','ARCHIVED')));
INSERT INTO memo SELECT * FROM memo_old;
DROP TABLE memo_old;
```

MySQL/PostgreSQL 使用 `ALTER TABLE ... DROP CHECK ... ADD CONSTRAINT` 方式。

## Risks / Trade-offs

- **[Low] 分页问题**: 如果 COMPLETED memo 数量很多，默认返回它们可能影响首页加载。→ 后续可加入 `ListMemos` 的 `state` 过滤支持多值（如 `state=NORMAL` 时排除 COMPLETED），当前先接受此限制。
- **[Low] 搜索影响**: 全局搜索可能返回 COMPLETED memo，与用户预期不符。→ 搜索结果默认不区分 state，用户可通过筛选控制。
- **[Low] 接口兼容**: `State` proto 枚举新增 `COMPLETED = 3`，旧客户端收到的 `state=3` 会 fallback 到 `STATE_UNSPECIFIED`。→ 由于 COMPLETED memo 在列表中与 NORMAL 一起返回，旧客户端会将其视为未归档，不影响展示。