---
name: memodo
description: 通过 MCP 工具操作 memodo 笔记与待办实例：记录内容、加/改标签、设置计划时间、归档或完成任务、按条件检索统计、批量审计标签体系。当用户提到 memodo、memo 笔记、我的待办、把这件事记到笔记里、查一下我之前记的 xxx、帮我整理标签、这条待办改到明天、归档掉完成的、统计我有哪些标签、批量改标签、审计标签树时，务必使用本技能 —— 即使他们没有提到 MCP 或工具名。同样适用于配置或排查 memodo 的 MCP 客户端（endpoint、PAT、只读模式、工具集裁剪）的场景。
---

# memodo 笔记与待办

memodo 是自托管笔记/待办工具，所有读写都通过 MCP 工具完成，没有独立的标签字段，也没有"追加"语义。

这个 skill 记两件事：**怎么正确调用工具**（参数形状、返回结构、已知陷阱）和**怎么按实例约定组织内容**（标签体系、计划时间、归档纪律）。跳过它最容易踩的四个坑：

1. `update_memo` 的 `content` 是**整体替换** —— 只传新增的几行，原有正文就没了
2. 标签只存在于 `content` 文本里 —— 改标签必须重写正文，且**每处**都要改
3. `search_memos` **只搜 NORMAL 状态**，归档和已完成条目搜不到
4. 新建时 `plan_start_time` **不能早于服务端当前时间**，用本地时钟卡点会被拒

## 1. 接入

### 先拿到 skill 文件

skill 随实例一起分发，不需要 clone 仓库：

| 地址 | 内容 |
|---|---|
| `GET /skills/memodo.zip` | 整个 skill（`SKILL.md` + `references/` + `scripts/`），解压后是 `memodo/` 目录 |
| `GET /skills/memodo/SKILL.md` | 主文件，浏览器可直接看 |
| `GET /skills/memodo/references/…` | 单个参考文件 |

```bash
curl -fLO https://<instance-host>/skills/memodo.zip
unzip memodo-skill.zip -d ~/.claude/skills     # 得到 ~/.claude/skills/memodo/
```

解压目标写你的客户端实际扫描的技能目录（Claude Code 是 `~/.claude/skills/`，pi 是 `~/.agents/skills/` 或 `~/.pi/agent/skills/`）。这些接口是公开的，不需要 token —— skill 里只有使用说明，没有用户数据。

### 连接 MCP

MCP 端点是实例根路径下的 `/mcp`，Streamable HTTP 传输（MCP spec 2025-03-26），`POST` 跑工具调用、`GET` 收服务端推送、`DELETE` 结束会话。

```bash
claude mcp add --scope user --transport http memodo https://<instance-host>/mcp \
  --header "Authorization: Bearer <PAT>"
```

PAT 在 **Settings → My Account → Access Tokens** 创建，长期有效。也可以用短期 JWT 会话 token。没有 token 只能读公开内容，任何写操作都会 401。

三个裁剪开关，配置客户端时可以按需打开：

| 控制 | 作用 |
|---|---|
| `/mcp/readonly` 或 `X-MCP-Readonly: true` | 隐藏并拦截所有写工具 —— 让 agent 只读自查时最安全 |
| `X-MCP-Toolsets: memos,tags` 或 `/mcp/x/memos,tags` | 只暴露指定工具集（可选 `memos` `tags` `attachments` `relations` `reactions`） |
| `X-MCP-Exclude-Tools: delete_memo` | 在黑名单里摘掉危险工具 |

**Origin 校验**：请求带 `Origin` 头时必须与实例同源，否则被拒。桌面客户端和 CLI 通常不发 `Origin`，不受影响 —— 如果你在浏览器里手搓请求，需要加 `Origin` 或不加这个头。

## 2. 数据模型：内容即一切

一条 memo 的核心字段：

```
name             memos/<uid>，所有工具的定位符
content          Markdown 全文，标签、待办勾选框、正文全在这
state            NORMAL(1) / ARCHIVED(2) / COMPLETED(3)
visibility       PRIVATE(1) / PROTECTED(2) / PUBLIC(3)
tags             []string，从 content 解析出来的只读投影
plan_start_time  Unix 秒，与 plan_end_time 成对出现
plan_end_time    Unix 秒
pinned           置顶
today_order      今天视图里的排序（fractional index）
parent           父 memo（评论/转发关系）
property         {has_task_list, has_incomplete_tasks, has_link, has_code} 派生标记
```

`tags` 是派生结果，不能直接写。想让一条 memo 带上 `#<一级>/<二级>`，就得让正文里真的出现这串标签文本。

## 3. 为什么先 `get_memo` 再 `update_memo`

`update_memo(content: ...)` 拿到的字符串会**覆盖**整条正文。想给一条已有笔记补一行，正确顺序是：

1. `get_memo(name)` 拿到完整 `content`
2. 在本地改动（追加、替换某个标签、勾选任务）
3. `update_memo(name, content: 改后的全文)`

只传 `plan_start_time` / `state` / `pinned` 等字段时不必带 `content`，这些是独立字段，不会波及正文。

## 4. 标签规范

标签是 memo 的组织骨架。下面五条是原则，不绑定任何具体实例的命名 —— 遵守它们，标签树才不会随时间退化成同义词堆积。

1. **树状结构**：标签用 `/` 分层，形如 `#一级/二级/三级`，层级就是分类路径。层数由使用者现有的树决定 —— 有的树只分一层，有的四五层，跟着现有结构走，不要自己发明新的一级。层数相称很重要：如果整棵树普遍是两层以上，孤零零的单层标签通常意味着它还没归位；反过来，在本来就只有一层的树里硬加一层，也是破坏。
2. **一条 memo 一般只打一个标签**。标签的作用是把它归到唯一位置；挂多个会让同一条内容在多个分支重复出现，计数和浏览都变模糊。只有当内容确实同时属于两个独立分支、且每个标签单独筛出来时都该包含它，才加第二个 —— 这是例外，不是默认。
3. **每条 memo 都应该有标签**。无标签的 memo 在列表、统计、日历里都是黑户，只能靠全文搜索捞回来。
4. **优先复用已有标签**。打标签前先 `list_tags` 拉全量，在现有树里找位置。确需新建分支时，先和用户确认 —— 自己起的分支名很难对上使用者的心智模型，多出来的分支要么被事后清理，要么永久变成同义词。
5. **挂在最底层节点**。有 `#a/b/c` 就不要用 `#a/b` 或 `#a`。中间层是分组容器，不是归档位置；挂在中间层会让"点开父级"看到一堆没细分的条目。

### 什么时候必须先问，而不是自己决定

最典型的出错场景：`create_memo` 时用户没给标签，或给的表述很模糊（"记一下这个"、"加到数据库那边"、"和上次那个放一起"）。这时**不要自己编一个**，按这个顺序处理：

1. `list_tags` 拉出当前标签树
2. 从中挑 2–4 个语义最接近的候选，把**完整路径 + 计数**一起摆给用户
3. 让用户选定，或者让他直接给出新路径

哪怕只有一两个候选，也值得问一句 —— 标签树是使用者长期维护的结构，猜错一次的修复成本远高于一次确认。

如果用户明确说了"这条不用加标签"，那就别加；没有明确说明时不要默认省略。

**位置**：`#标签` 放在正文最前、独立成行，空行之后再写正文。正文中间或末尾遗留的标签行要清掉 —— 同一处内容不该有第二个标签入口，多出来的那行渲染后同样是可点链接，用户会当成正文。

### 解析规则（由 Goldmark AST 决定，不是正则猜的）

- 必须以 `#` 开头，后接**至少一个**有效字符
- 有效字符：Unicode 字母（含中文）、Unicode 数字、Unicode 符号（含 emoji）、组合标记、ZWJ、以及 `_` `-` `/` `&`
- 遇到空白、标点或其他字符就截断
- 单标签最长 **100 个 rune**（按字符数，不是字节）
- `##` 是标题、`#` 后跟空格是标题，都不是标签
- **大小写敏感**：`#Foo/Bar` 与 `#foo/bar` 是两个标签，且保留原始大小写
- 正文里裸写的词（比如 `（password）`）不会被识别成标签 —— 没有 `#` 就不算

反例（都不会生成标签）：`# 待办`（空格）、`##项目`（双井号）、`#（括号开头的标点）`、`#`（孤立井号）、超过 100 字符的长串。

## 5. 计划时间

`plan_start_time` 和 `plan_end_time` 必须**同时设置或同时不设**，只给一个会被拒。

- **新建**（`create_memo`）：`plan_start_time` 不能早于服务端当前时间。服务端时钟通常比本地快几十秒，卡着"现在"填会被 `plan_start_time cannot be in the past` 拒掉 —— 留 1–2 分钟余量。
- **更新**（`update_memo`）：允许设成过去时间，这是给拖拽排序、事后补录留的口子。
- **清空**：把两个字段都传 `null`。传 `-1/-1` 是服务端内部哨兵值，MCP 层不推荐使用。
- `plan_end_time` 必须 ≥ `plan_start_time`。
- 时间值是 **Unix 秒**（整数），接受 `float64`、`int64` 或数字字符串。

没有计划时间的 memo 不会出现在日历和"今天"视图里。需要排期的事项，把两个时间一起给上。

## 6. 工具速查

完整参数表和返回结构见 `references/mcp-tools.md`。日常最常用的六个：

| 工具 | 用来做什么 | 关键参数 |
|---|---|---|
| `list_memos` | 按条件列条目 | `state`（NORMAL/COMPLETED/ARCHIVED）、`order_by`（`plan_start_time asc` 等 AIP-132 字段）、`filter`（CEL 子集）、`page_size`（1–100） |
| `search_memos` | 全文搜索 | `query`。**只返回 NORMAL**，要查归档得用 `list_memos(state: ARCHIVED)` |
| `get_memo` | 取全文（改之前必做） | `name` |
| `create_memo` | 新建 | `content`，可选 `visibility`、一对计划时间 |
| `update_memo` | 改内容/状态/计划 | `name` + 要改的字段；`content` 是整体替换 |
| `list_tags` | 拉标签树和计数 | 无参数，返回 `{tags: [{tag, count}]}` |

`filter` 支持 CEL 的一个子集，字段包括 `content`、`creator`、`created_ts`、`updated_ts`、`pinned`、`visibility`、`tags`、`tag`、`has_task_list`、`has_incomplete_tasks`、`has_link`、`has_code`。常用写法：

```
content.contains("关键词")
tags.exists(t, t == "<一级>/<二级>")
has_incomplete_tasks == true
created_ts > 1767225600
```

分页：单页最多 100 条，返回 `has_more`；按 `page` 递增翻页。要统计全量，别只取第一页。

## 7. 常见任务配方

**记一条带排期的待办**
```
create_memo(
  content: "#<一级>/<二级>\n\n- [ ] 把 xxx 做完",
  plan_start_time: <明天 09:00 的 Unix 秒>,
  plan_end_time:   <明天 18:00 的 Unix 秒>,
)
```
标签独占第一行、空行后写正文，之后列表页和日历都能正确归组。标签名先跟用户确认，见第 4 节。

**给已有笔记补标签**（必须走整体替换）
```
m = get_memo("memos/xxx")
content = m.content            # 拿到全文
content = "#<一级>/<二级>\n\n" + content   # 确保首行是标签行
# 若原文中间还有旧标签行，一并清掉
update_memo(name: "memos/xxx", content: content)
```

**归档完成的条目**
```
update_memo(name: "memos/xxx", state: "ARCHIVED")
```
归档后 `search_memos` 就查不到了，这是预期行为，不是数据丢了。

**按标签查某一类**
```
list_memos(filter: 'tags.exists(t, t == "<一级>/<二级>")', page_size: 100)
```
或用 `search_memos(query: "#<一级>/<二级>")`，但后者只覆盖 NORMAL。

**统计标签分布**
```
list_tags()   # 返回全部标签及计数，按 count 排序看哪些是长尾
```

**审计全部未完成 memo 的标签（只读，只给建议）**

范围：未完成、未归档（`state == NORMAL`）。这里有个坑 —— `list_memos(state: "NORMAL")` 会把 **COMPLETED 一起返回**，所以拉回来之后要再按每条自己的 `state` 过滤一次，否则已完成的条目会混进审计结果。

1. 分页拉全量：`list_memos(state: "NORMAL", page_size: 100, page: 0/1/2…)`，直到 `has_more` 为 false
2. `list_tags()` 拉标签树
3. 把两份结果拼成快照文件（格式见下）
4. 跑脚本：`python3 scripts/audit_tags.py snapshot.json --json suggestions.json`
5. 把报告转成给用户的建议清单，逐项确认 —— **审计阶段不改任何数据**

快照格式（脚本只读它，不联网）：

```json
{
  "memos": [
    {"name": "memos/abc", "content": "#一级/二级 正文…", "state": "NORMAL",
     "tags": ["一级/二级"], "plan_start_time": 1767225600}
  ],
  "tags": [{"tag": "一级/二级", "count": 12}]
}
```

脚本按五条原则逐条对照，输出（见 `scripts/audit_tags.py`）：

| 检查项 | 对应原则 | 说明 |
|---|---|---|
| `NO_TAG` | 3 | 一条标签都没有 |
| `MULTI_TAG` | 2 | 挂了多个，要确认是否真横跨两个分支 |
| `DEPTH_TOO_SHALLOW` | 1 | 层数少于树的主体深度 |
| `MID_LAYER` | 5 | 父级下的子分支用量已超过父级，说明主体已经细分 |
| `LOW_REUSE` | 4 | 只被一条 memo 使用的生僻分支（有子分支的不算） |
| `SYNONYM` | 4 | 大小写折叠或 `__`→`/` 后等价的写法 |

报告会带上「概览 → 问题分布 → 分组明细 → 下一步」，每项都标了置信度和"需用户确认"。把低置信度的项（生僻分支、下沉建议）作为参考、高置信度的项（同义标签、无标签）优先让用户拍板。

完整执行流程、快照如何拉取、报告怎么解读，见 `references/tag-audit.md` 的「全量审计执行流程」。

## 8. 批量改动的纪律

批量操作是这个工具集最容易出事的地方 —— 一次 `update_memo` 就是一次全文覆盖，改错一条没法撤销。`scripts/audit_tags.py` 只能给出建议，它从不调用 MCP（只读传入的 JSON 快照），真正的改动必須由你逐条执行。按这个顺序来：

1. **先备份原文**。`list_memos` 拉全量，把 `name` + `content` 落到本地文件（JSON 或 Markdown）。没有备份不动手。
2. **先单条验证**。挑一条最典型的，改完用 `get_memo` 读回确认：标签是否只剩新写法、正文其余部分是否完好、`tags` 投影是否符合预期。
3. **区分三类，不要一刀切**：该改标签的、该删除的、该保留的。归类存疑的以正文内容为准，问过使用者再动。
4. **逐条写、逐条读回**。不要连发几十个 `update_memo` 再统一检查 —— 出错时你分不清是哪一条写坏了。
5. **改完复核**：重新 `list_tags`，确认没有产生新的同义标签；抽查若干条 `get_memo`。

标签审计的六个维度和具体筛查方法见 `references/tag-audit.md`。

## 9. 排错

| 现象 | 原因与处理 |
|---|---|
| `401 invalid or expired token` | PAT 过期或被吊销，重新在 Settings 生成，更新客户端头 |
| `Invalid MCP tools/call structured content` | 客户端对 `structuredContent` 校验严格。部分版本的 `list_tags` 曾返回裸数组，已修复为 `{tags: [...]}`；仍遇到就退化读 `content[0].text` 里的 JSON 文本 |
| `plan_start_time cannot be in the past` | 新建时时间早于服务端 now，加余量 |
| `plan_start_time and plan_end_time must be provided together` | 只传了一个，成对补齐或都省略 |
| `plan_end_time must be after or equal to plan_start_time` | 起止反了 |
| 搜索查不到明明存在的条目 | 它可能是 ARCHIVED/COMPLETED，换 `list_memos(state: ...)` |
| 标签没生效 | 检查是否有 `#`、是否被空格或标点截断、是否超过 100 字符、是否误写成 `##` |
| 请求被拒但 token 正确 | `Origin` 头与实例不同源，去掉或改成实例域名 |
| 工具列表里没有想要的工具 | 客户端用了 `/mcp/x/...` 或 `X-MCP-Toolsets` 裁剪，扩大工具集 |
