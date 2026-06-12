## Context

Memodo 已经支持 memo 的三态流转：NORMAL → COMPLETED → ARCHIVED。用户可以通过勾选框将 memo 标记为 COMPLETED，也可以通过菜单手动归档。但 COMPLETED 状态的 memo 会长期积累在已完成折叠区中，需要用户手动逐个归档。

现有存档机制：
- `store/common.go`: `RowStatus` 支持 `NORMAL`, `COMPLETED`, `ARCHIVED`
- `store/memo.go`: `FindMemo` 支持按 `RowStatus` 和 `CreatorID` 筛选
- `store/memo.go`: `UpdateMemo` 支持更新 `RowStatus`
- 后台 runner 模式已确立（`server/runner/s3presign/runner.go` 使用 ticker 模式）
- 用户设置通过 `store/user_setting.proto` 的 `UserSetting` 体系管理
- 前端用户设置通过 `PreferencesSection` 和 `useUpdateUserGeneralSetting` 模式管理

## Goals / Non-Goals

**Goals:**
- 新增用户级设置 `AUTO_ARCHIVE`，可在个人中心的设置页面配置
- 默认关闭，默认归档天数为 15 天
- 后台定时任务每天执行一次，自动将超期的 COMPLETED memo 转为 ARCHIVED
- 自动归档触发时发送正常的 SSE 事件和 webhook

**Non-Goals:**
- 不改变现有的手动归档行为
- 不修改 memo 的 API 接口（无新增 RPC）
- 不添加实例级/全局的自动归档设置（仅限用户级别）
- 不提供按标签、可见性等条件筛选归档

## Decisions

### 1. 使用 ticker 模式而非 cron scheduler

**选择**: 沿用现有 `server/runner/s3presign/runner.go` 的 ticker 模式（24 小时间隔），而非 `internal/scheduler` 包。

**理由**: 
- 与现有 background runner 模式一致，代码风格统一
- `startBackgroundRunners()` 已有完善的 lifecycle 管理（context cancel, WaitGroup）
- 不需要精确到秒级的调度，每天执行一次足矣
- scheduler 包适合更复杂的多 job 调度场景，本场景不需要

### 2. 用户设置使用 UserSetting 体系

**选择**: 在 `store/user_setting.proto` 新增 `UserSetting.Key.AUTO_ARCHIVE = 8`，新建 `AutoArchiveUserSetting` 消息。

**理由**:
- 现有的 UserSetting 体系已完善支持用户级配置（`UpsertUserSetting`, `ListUserSettings`, 缓存）
- 与 `GeneralUserSetting`（locale, theme, visibility）模式一致
- 前端 `useUpdateUserGeneralSetting` 模式可复用

### 3. 自动归档按用户维度遍历

**选择**: 每天扫描所有用户，逐个检查其 AUTO_ARCHIVE 设置，对有启用的用户执行归档查询。

**理由**:
- 需要对每个用户使用不同的 `archive_after_days` 值
- 用户量不会特别大（Memodo 是个人/小团队工具）
- SQL 查询可以高效按 `creator_id + row_status + updated_ts` 筛选
- 相比一次查询所有 COMPLETED memo 再逐个判断，按用户维度更清晰

### 4. 使用 `updated_ts` 作为时间判断依据

**选择**: 使用 memo 的 `updated_ts` 字段判断从标记完成到现在的时间，而非新增字段。

**理由**:
- 当 memo 变为 COMPLETED 时，`updated_ts` 会自动更新
- 不需要新增数据库字段或 proto 字段
- 注意：如果 memo 在 COMPLETED 状态后被编辑（如修改内容），`updated_ts` 会刷新，但这在语义上也是合理的——以最后一次操作为准

### 5. Proto Key 值选择

`UserSetting.Key.AUTO_ARCHIVE = 8`（在 `PERSONAL_ACCESS_TOKENS = 7` 之后），与 store 层和 API 层的 key 保持一致。

### 6. 范围校验

`archive_after_days` 的范围限制为 1-365。最小值 1 天防止用户设为 0 导致立即归档的意外行为，最大值 365 避免过大的不合理值。

## Risks / Trade-offs

- **updated_ts 精度**: 如果用户在完成 memo 后再次编辑内容，`updated_ts` 会更新，归档时间被推迟。这是可接受的——最后一次操作时间作为"最近活跃"的指标。如果需要更精确的"完成时间"，未来可考虑增加 `completed_ts` 字段。
- **大量用户场景**: 如果实例有上千用户且都启用了自动归档，每天遍历所有用户可能带来小量延迟。当前每个用户最多一次 SQL 查询，影响可控。
- **并发安全**: 自动归档任务修改 memo 状态时，用户可能同时在修改同一个 memo。由于这是幂等操作（COMPLETED → ARCHIVED 只发生一次），冲突影响有限。
