# memodo MCP 工具完整参考

本文件是 `SKILL.md` 的附录：所有工具的完整参数、返回结构和裁剪开关。日常操作看 `SKILL.md` 的速查表就够，需要细节时回到这里。

## 目录

- [传输与认证](#传输与认证)
- [工具裁剪](#工具裁剪)
- [返回结构约定](#返回结构约定)
- [Memo 工具](#memo-工具)
- [标签工具](#标签工具)
- [附件工具](#附件工具)
- [关系工具](#关系工具)
- [表情回应工具](#表情回应工具)
- [Resources](#resources)
- [Prompts](#prompts)
- [filter 语法](#filter-语法)

## 传输与认证

```
POST   /mcp    工具调用、initialize
GET    /mcp    可选的服务端消息流（SSE）
DELETE /mcp    结束会话
```

Transport 是 Streamable HTTP（MCP spec 2025-03-26），单个端点承载全部交互。

认证头：

```
Authorization: Bearer <PAT 或 JWT 会话 token>
```

无 token 时只能读公开内容；任何写工具返回 `401`。

`Origin` 头存在时必须与请求 host 同源，或匹配实例配置的 `instance-url`。没有 `Origin` 的请求（桌面客户端、CLI）直接放行。

## 工具裁剪

同一个 `/mcp` 端点，可以用头部或路径别名缩小工具面：

| 头部 | 路径别名 | 效果 |
|---|---|---|
| `X-MCP-Readonly: true` | `/mcp/readonly` | 隐藏并拦截写工具 |
| `X-MCP-Toolsets: memos,tags` | `/mcp/x/memos,tags` | 只暴露选中工具集 |
| `X-MCP-Tools: list_tags,get_memo` | — | 在选中工具集基础上追加工具 |
| `X-MCP-Exclude-Tools: delete_memo` | — | 从最终列表移除指定工具 |

工具集名称：`memos`、`tags`、`attachments`、`relations`、`reactions`。只读与工具集可组合，例如 `/mcp/x/memos,tags/readonly`。

## 返回结构约定

每个工具返回 JSON-RPC `result`：

- `content[0].text` —— 负载的文本形式
- `structuredContent` —— 同一份数据的 JSON 对象（部分客户端会校验它必须是对象）

列表型工具把条目包在具名键下：

| 工具 | `structuredContent` 键 |
|---|---|
| `list_memos` | `memos` + `has_more` |
| `search_memos` | `memos` |
| `list_memo_comments` | `memos` |
| `list_tags` | `tags` |
| `list_attachments` | `attachments` + `has_more` |
| `list_reactions` | `reactions` |
| `list_memo_relations` | `relations` |

`content[0].text` 对列表型工具保留裸数组 JSON，兼容只读文本的客户端。

## Memo 工具

### `list_memos`

| 参数 | 必填 | 说明 |
|---|---|---|
| `filter` | 否 | CEL 子集，见[filter 语法](#filter-语法) |
| `order_by` | 否 | AIP-132 语法，字段：`pinned`、`create_time`、`update_time`、`plan_start_time`、`plan_end_time`、`completed_time`、`archived_time`、`smart`、`today_order`、`name`；可组合，如 `pinned desc, create_time desc`。查“最近完成”用 `completed_time desc` |
| `order_by_pinned` | 否 | 已废弃，用 `order_by` |
| `page` | 否 | 从 0 开始 |
| `page_size` | 否 | 1–100，默认 20 |
| `state` | 否 | `NORMAL`（默认，含 COMPLETED）/ `COMPLETED` / `ARCHIVED` |

### `get_memo`

`name`（必填）。改任何内容之前先用它取全文。

### `search_memos`

`query`（必填）。**只返回 NORMAL 状态**。查归档/完成条目改用 `list_memos(state: ...)`。

### `create_memo`

| 参数 | 必填 | 说明 |
|---|---|---|
| `content` | 是 | Markdown 全文，标签写在正文里 |
| `visibility` | 否 | `PRIVATE` / `PROTECTED` / `PUBLIC` |
| `plan_start_time` | 否 | Unix 秒，不能早于服务端 now |
| `plan_end_time` | 否 | Unix 秒，必须 ≥ start |

两个计划时间要成对出现。

### `update_memo`

| 参数 | 必填 | 说明 |
|---|---|---|
| `name` | 是 | 目标 memo |
| `content` | 否 | **整体替换**，不是追加 |
| `visibility` | 否 | |
| `pinned` | 否 | bool |
| `state` | 否 | `NORMAL` / `COMPLETED` / `ARCHIVED` |
| `plan_start_time` | 否 | 更新时允许过去时间 |
| `plan_end_time` | 否 | |
| `today_order` | 否 | 今天视图排序 |

只传 `state`/`pinned`/计划时间不会碰正文。`update_time` 不可写（传了会被静默忽略），它由服务端在正文本体变化时自动刷新；完成/归档时间分别是只读的 `completed_time` / `archived_time`。

计划时间清空：两个字段都传 `null`。

### `delete_memo`

`name`（必填）。不可恢复。

### `list_memo_comments` / `create_memo_comment`

`list_memo_comments(name)`；`create_memo_comment(name, content)`。评论的可见性跟随父 memo。

## 标签工具

### `list_tags`

无参数，返回 `{tags: [{tag, count}]}`。用于打标签前摸底、批量改完复核、统计标签分布。

## 附件工具

| 工具 | 参数 | 说明 |
|---|---|---|
| `list_attachments` | 可选 `page_size`、`page`、`memo` | 列当前用户的附件 |
| `get_attachment` | `name` | 附件元数据 |
| `delete_attachment` | `name` | 删除 |
| `link_attachment_to_memo` | `name`、`memo` | 把附件挂到自己的 memo |

## 关系工具

| 工具 | 参数 | 说明 |
|---|---|---|
| `list_memo_relations` | `name`，可选 `type` | 引用关系和评论 |
| `create_memo_relation` | `name`、`related_memo` | 从自己的 memo 引用一条可读的 memo |
| `delete_memo_relation` | `name`、`related_memo` | 删除引用 |

## 表情回应工具

| 工具 | 参数 |
|---|---|
| `list_reactions` | `name` |
| `upsert_reaction` | `name`、`reaction_type` |
| `delete_reaction` | `id` |

## Resources

| URI 模板 | 类型 | 说明 |
|---|---|---|
| `memo://memos/{uid}` | `text/markdown` | memo 正文，带 YAML frontmatter |

服务端声明支持资源订阅和变更通知。

## Prompts

| Prompt | 参数 | 用途 |
|---|---|---|
| `capture` | `content` 必填，`tags`、`visibility` 可选 | 快速记一条 |
| `review` | `topic` 必填 | 检索并归纳某主题的 memo |
| `daily_digest` | `days` | 汇总最近 N 天的记录 |
| `organize` | `scope` | 建议标签/关系 |

## filter 语法

支持标准 CEL 的一个子集，可用字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `content` | string | 正文全文 |
| `creator` | string | 创建者用户名 |
| `creator_id` | number | 创建者 ID |
| `created_ts` | number | 创建时间（Unix 秒） |
| `updated_ts` | number | 更新时间 |
| `pinned` | bool | 置顶 |
| `visibility` | string | `PRIVATE` / `PROTECTED` / `PUBLIC` |
| `tags` | list\<string\> | 标签列表 |
| `tag` | string | 单个标签匹配的快捷字段 |
| `has_task_list` | bool | 含待办列表 |
| `has_incomplete_tasks` | bool | 含未完成待办 |
| `has_link` | bool | 含链接 |
| `has_code` | bool | 含代码块 |

支持的调用与宏：`contains()`、`startsWith()`、`exists()`、`all()`、`filter()`。

示例：

```
content.contains("token")
tags.exists(t, t == "<一级>/<二级>")
tags.exists(t, t.startsWith("<一级>/"))
has_incomplete_tasks == true
created_ts > 1767225600
creator == "<username>" && pinned == true
```

`&&`、`||`、`!` 和比较运算可用；跨字段的复杂嵌套建议拆成多次查询后再在本地合并。
