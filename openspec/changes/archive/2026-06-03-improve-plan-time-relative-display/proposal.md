## Why

当前 memo 卡片的计划时间以绝对日期时间格式（如 `📅 6/15, 14:00 ~ 6/15, 16:00`）展示，用户需要自行心算距离现在还有多久、持续多长时间。同时卡片上还显示了创建/更新时间，与计划时间并存造成信息冗余。改为三态相对时间展示 + 移除创建时间，让卡片更聚焦于事项本身的时间规划，减少视觉噪音。精确时间信息仍可通过 hover tooltip 查看。

## What Changes

- 修改 `PlanTimeDisplay` 组件，将「📅 绝对开始时间 ~ 绝对结束时间」替换为三态相对时间展示：
  - 未开始：`1.5小时后开始 · 持续2小时`
  - 进行中：`进行中 · 1.5小时后结束`
  - 已过期：`已过期`
- 时间值使用单一最大单位 + 一位小数精度，整数省略 `.0`
- 移除卡片上的创建/更新时间文字展示（`displayTime`），hover tooltip 中仍保留所有精确时间
- 添加前端国际化翻译键以支持中英文相对时间表达

## Capabilities

### New Capabilities

- `plan-time-relative-display`: 将计划时间以三态相对时间格式展示在 memo 卡片上，替代原有的绝对日期时间格式；同时移除卡片上的创建/更新时间文字

### Modified Capabilities

- `memo-plan-time`: 修改「前端 memo 卡片展示计划时间范围」需求——从展示绝对日期时间改为三态相对时间展示；移除创建/更新时间文字

## Impact

- **前端组件**: `MemoHeader.tsx` 中的 `PlanTimeDisplay`、`TimeDisplay`、`CreatorDisplay` 组件——移除时间文字展示，保留 tooltip 和导航点击
- **国际化**: `locales/en.json`、`locales/zh-Hans.json` 等语言文件需新增相对时间相关翻译键
- **依赖**: 不再依赖 `@github/relative-time-element` 用于计划时间展示
