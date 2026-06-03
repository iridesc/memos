## Context

当前 `PlanTimeDisplay` 组件使用 `Intl.DateTimeFormat` 将计划时间渲染为「📅 M/D, HH:MM ~ M/D, HH:MM」格式的绝对日期时间。用户需要自行心算距离现在的时间和持续时长。项目已有一个 `@github/relative-time-element` web component 用于主时间显示（创建/更新时间），但它不支持复合格式。

修改仅涉及前端展示层，后端 API 和数据库无需变更。

## Goals / Non-Goals

**Goals:**
- 将 memo 卡片上的计划时间展示从绝对时间改为三态相对时间（未开始 / 进行中 / 已过期）
- 时间值使用单一最大单位 + 一位小数精度
- 支持中英文本地化
- 保留 tooltip 中的绝对时间作为精确参考

**Non-Goals:**
- 不修改后端 API 或数据库字段
- 不修改编辑器中的计划时间选择器（仍使用绝对时间选择）
- 不新增第三方依赖

## Decisions

### Decision 1: 三态展示模型

**选择**: 根据 `plan_start_time` / `plan_end_time` 与 `now` 的关系分为三种状态，每种状态有不同的展示策略：

| 状态 | 条件 | 中文展示 | 英文展示 |
|------|------|---------|---------|
| 未开始 | start > now | `1.5小时后开始 · 持续2小时` | `in 1.5h · lasts 2h` |
| 进行中 | start < now < end | `进行中 · 1.5小时后结束` | `in progress · ends in 1.5h` |
| 已过期 | end < now | `已过期` | `expired` |

**理由**: 
- **进行中**省略「X前开始」，因为对于正在进行的任务，用户更关心「还剩多少时间」而非「已经开始了多久」——后者是冗余信息。
- **已过期**不展示时长——用户明确表示已完成的任务应手动归档，显示「已过期」是一个提醒信号，促使行动。
- **未开始**展示开始倒计时 + 总持续时长，帮助用户评估任务的时间占用。

### Decision 2: 自定义格式化函数 vs 复用 `@github/relative-time-element`

**选择**: 编写自定义 `formatRelativePlanTime` 工具函数，返回 `{ state, startOffset, duration }` 结构化数据，由组件渲染。

**理由**: `@github/relative-time-element` 是 web component，无法表达三态复合格式。自定义函数更灵活，返回结构化数据让组件专注于渲染。

### Decision 3: 时间单位与小数精度

**选择**: 单一最大单位 + 一位小数。

| 差值范围 | 单位 | 示例 |
|-----------|------|------|
| 0–59 分钟 | 分钟（整数） | `30分钟后` |
| 60 分钟 – 23.9 小时 | 小时（1 位小数） | `1.5小时后` |
| 24 小时 – 29.9 天 | 天（1 位小数） | `2.5天后` |
| ≥ 30 天 | 月（1 位小数） | `1.5月后` |

整数时省略 `.0`：`2小时后` 而非 `2.0小时后`。

分钟级别不需要小数（最小粒度就是分钟）。

**计算**: `value = Math.round(diffInBaseUnit * 10) / 10`，然后 strip trailing `.0`。

**理由**: 单一最大单位比「1小时30分钟」更简洁。一位小数提供足够的精度（0.1小时 ≈ 6分钟），用户可以感知时间量级。

### Decision 4: 特殊边界处理

- `< 60 秒` → 未开始时用「即将开始」、进行中时用「即将结束」
- `plan_end_time` 恰好等于 `plan_start_time`（0 时长）→ 持续显示「持续不到1分钟」

### Decision 5: 国际化方案

**选择**: 使用 i18n 翻译键表达三态句式和单位。

翻译键设计：
```json
{
  "plan-time": {
    "not-started": "{{time}}后开始 · 持续{{duration}}",
    "in-progress": "进行中 · {{time}}后结束",
    "expired": "已过期",
    "starts-imminent": "即将开始 · 持续{{duration}}",
    "ends-imminent": "进行中 · 即将结束",
    "unit-minute": "{{count}}分钟",
    "unit-hour": "{{count}}小时",
    "unit-day": "{{count}}天",
    "unit-month": "{{count}}月"
  }
}
```

**理由**: 中文句式为「X后开始」而英文为「starts in X」——词序完全不同。句式级别的翻译键正确支持这种差异。

### Decision 6: 移除卡片上的创建/更新时间文字

**选择**: 移除 `MemoHeader` 中的 `displayTime` 文字展示（当前通过 `<relative-time>` 渲染创建/更新/计划时间）。保留 hover tooltip 中的精确时间信息。

具体变更：
- `CreatorDisplay`: 移除 `displayTime` prop，仅展示 creator 头像 + 名称
- `TimeDisplay` 组件: 移除（不再需要），以 `PlanTimeDisplay` 替代作为时间展示区域
- `timeValue` / `displayTime` 变量: 移除相关计算逻辑
- tooltip 中的 `createdAt` / `updatedAt` 行: 保留

没有计划时间的 memo 卡片上将不再显示任何时间文字（仅有 creator 头像/名称）。

**理由**: 创建时间文字与计划时间并存造成信息冗余。对于有计划时间的 memo，计划时间已经传达了时间信息；对于没有计划时间的 memo，创建时间对用户意义不大且产生视觉噪音。精确时间仍可通过 hover tooltip 查看。

### Decision 7: 文件组织

**选择**: 
- 新建 `web/src/lib/time.ts` — `formatRelativePlanTime()` 纯函数
- 修改 `MemoHeader.tsx` — `PlanTimeDisplay` 组件使用新函数，移除 `TimeDisplay` 和 `displayTime` 相关逻辑
- 修改 `web/src/locales/*.json` — 新增翻译键

**理由**: 格式化逻辑与渲染解耦，方便单元测试和复用。

## Risks / Trade-offs

- **[Low] 页面不刷新时相对时间过时**: 与现有「x 分钟前」行为一致，后续可加周期性刷新。
- **[Low] > 12 个月的未来时间**: 「x 月后」可能不够直观，后续可加「x 年后」。
- **[Low] 时区**: UTC Timestamp → 本地 Date → 与 `Date.now()` 比较，结果正确。
