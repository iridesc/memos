## Why

该项目是从 usememos/memos 的 fork，在原始 memo 功能基础上增加了完整的 todo 任务管理能力（计划时间、完成状态、今日面板等）。原有名称 "memos" 已无法体现项目的定位和功能范围，需要一个新的项目名称来反映 "memo + todo" 的融合定位，建立独立品牌 identity。

## What Changes

- **项目名称**：从 `memos` 改为 `memodo`
- **Go module path**：从 `github.com/usememos/memos` 改为 `github.com/<user>/memodo`
- **二进制名称**：编译产物从 `memos` 改为 `memodo`
- **Docker 镜像**：镜像名从 `memos` 改为 `memodo`
- **前端包名**：`package.json` 中的 `name` 字段更新
- **所有 import 路径**：Go 代码中的内部 import 路径更新
- **CLI 命令名**：Cobra 根命令从 `memos` 改为 `memodo`
- **版本/身份字符串**：代码中所有显示项目名称的地方更新
- **README 和文档**：更新为新的项目名称
- **Docker Hub 发布**：以新名称构建并推送到 Docker Hub

## Capabilities

### New Capabilities

本次变更是项目重命名，不引入新的功能 capability。现有 capability specs（`memo-plan-time`、`plan-time-relative-display`、`today-panel`、`memo-completed-state`）保持不变，它们已经是该 fork 的一部分。

### Modified Capabilities

无。功能行为不发生变化。

## Impact

- **Go 后端**：`go.mod` module path、所有 Go 源文件中的 import 路径、CLI 命令注册、版本包中的项目名
- **前端**：`package.json` name、构建输出路径、运行时显示名称
- **Docker/部署**：Dockerfile 中的镜像标签、entrypoint 路径
- **Proto**：proto package 路径（如果需要可一并更新）
- **CI/CD**：工作流文件中引用的项目名、镜像名、二进制名
- **文档**：README、配置示例等
- **Docker Hub 发布**：首次以 `memodo` 名称构建并 push 到 Docker Hub
