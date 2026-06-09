## Context

当前 `PlanTimeDisplay` 组件对所有三种计划时间状态（未开始、进行中、已过期）使用统一的 CSS 类名：`text-xs text-muted-foreground`。这意味着已过期的 memo 在列表中与其他状态视觉上无异，用户需要逐条查看才能发现过期项。

项目使用 Tailwind CSS v4 和 OKLch 颜色 tokens，`text-destructive` 已定义为红色系颜色（`--destructive: oklch(0.5 0.12 25)`），用于错误和危险状态提示。

## Goals / Non-Goals

**Goals:**
- 为 `PlanTimeDisplay` 组件的 `expired` 状态分支添加独立样式：`font-bold` + `text-destructive`
- 保持其他状态（未开始、进行中）样式不变
- 不影响过期判断逻辑、文本内容或国际化

**Non-Goals:**
- 不改变 memo 卡片的其他视觉元素
- 不添加动画或额外 UI 元素
- 不修改后端或数据模型

## Decisions

### 颜色选择：`text-destructive`

使用项目已有的 `text-destructive` token（OKLch 红色系），而非硬编码颜色值。

**替代方案：**
- `text-red-500`：Tailwind 内置红色，但与项目设计系统无关，切换主题时不会联动
- `text-warning`（黄色/橙色）：通常表示"注意"而非"需行动"，红色更能传达过期需要处理的紧迫感
- 自定义颜色 token：过度设计，`text-destructive`语义契合（过期 = 需要处理的行为）

选择 `text-destructive` 因为：(1) 已是项目设计系统的一部分，所有主题均定义；(2) 语义匹配——过期是"需要用户行动"的信号；(3) 自动适配暗色/亮色/纸质主题。

### 加粗：`font-bold`

使用 Tailwind 的 `font-bold`（`font-weight: 700`），使过期文本在扫描时明显突出。`font-semibold`（600）视觉差异不够显著。

## Risks / Trade-offs

- [轻微视觉噪音] 列表中多个 memo 同时过期时，过多红色加粗文字可能显得杂乱 → 已过期的 memo 本就是异常状态，理应引起注意；红色加粗相对于常规 muted 文本是合理的视觉层级提升
- [无功能风险] 纯 CSS 类名变更，不影响任何逻辑、数据或 API
