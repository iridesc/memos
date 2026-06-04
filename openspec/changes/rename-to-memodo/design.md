## Context

当前项目是 usememos/memos 的 fork，在原始 memo 功能上叠加了 todo 任务管理能力。由于初始 fork 时沿用了全部原始名称，目前项目内所有标识仍为 "memos"。本次重命名将其改为 "memodo"，涉及 Go module path、import 路径、CLI 命令名、二进制名、前端包名、Docker 镜像名等全方位的标识更新。

## Goals / Non-Goals

**Goals:**
- Go module path 从 `github.com/usememos/memos` 改为 `github.com/usememos/memodo`
- 所有 Go 源码中的 import 路径同步更新
- 编译产物二进制名称从 `memos` 改为 `memodo`
- Cobra CLI 根命令名更新
- 前端 `package.json` 中的 `name` 更新
- Docker 镜像名和标签更新（`memos` → `memodo`）
- CI/CD 工作流中引用的产物名更新
- 版本信息字符串中显示的项目名称更新
- 文档（README 等）更新

**Non-Goals:**
- 不改变任何业务逻辑和功能行为
- 不修改数据模型或数据库 schema
- 不修改 proto API 定义（proto package 路径可保留，避免破坏客户端兼容性）
- 不修改 git 历史或 commit 信息
- 不修改 GitHub 仓库名（仅代码内部标识）

## Decisions

### 1. Module path: `github.com/usememos/memodo`

**决策**: 将 module path 改为 `github.com/usememos/memodo`，保留 `usememos` 组织名以延续上下文。

**理由**: 
- 保留组织名可以减少外部依赖引用方式的改动量
- `memodo` 与原 `memos` 共享 `usememos` 组织，表明派生关系
- 所有内部 import 从 `github.com/usememos/memos/xxx` 改为 `github.com/usememos/memodo/xxx`

### 2. 重命名策略：全量替换而非逐步迁移

**决策**: 一次性全局替换所有代码中的旧名称，不采用兼容层或过渡期。

**理由**:
- 无外部 API 消费者（未发布），不需要向后兼容
- 所有 import 都是内部引用，统一替换即可
- 使用 `find` + `sed` 批量处理比逐文件修改更可靠

### 3. 变更顺序：基础 → 依赖层 → 引用层 → 文档

**决策**: 按以下顺序依次修改：

1. `go.mod`（module path）
2. `proto/buf.yaml`、`proto/gen/`（生成代码的 import 需同步）
3. Go 源码中的 import 路径（全量替换）
4. CLI 命令名和二进制名
5. 版本/身份字符串
6. 前端 `package.json` 和构建配置
7. Docker 和 CI/CD 配置
8. 文档

### 4. Proto package 路径

**决策**: 暂时保留 proto package 路径为 `memos`，不在本次改动中修改。

**理由**: proto package 变更会影响 gRPC service 定义和 wire 协议，属于 breaking change。在没有外部消费者的情况下可以改，但应作为独立步骤。本次聚焦代码级 rename，wire 协议层面的重命名后续再做。

## Risks / Trade-offs

- **git blame 干扰**：全局重命名会使得 `git blame` 结果集中在本次 commit 上 → 接受，该 commit 信息清晰，后续 blame 可 `--ignore-rev`
- **未发布的外部引用**：如果有人在其他地方 import 了当前 module → 不兼容，需通知更新（当前是个人项目，风险低）
- **遗漏某些路径替换**：可能出现某些文件中仍保留旧名称 → 在 CI 和构建阶段验证，binary 中不应出现 "memos" 字符串（Docker 镜像名等预期出现的除外）
- **Proto 生成代码手工修改**：`proto/gen/` 中的生成代码需要手动更新 import 路径 → 在 tasks 中记录为明确步骤，修改后运行 `go build` 验证
