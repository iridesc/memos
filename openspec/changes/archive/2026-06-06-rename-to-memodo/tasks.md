## 1. Go Module & Import 路径

- [x] 1.1 修改 `go.mod` module path：`github.com/usememos/memos` → `github.com/usememos/memodo`
- [x] 1.2 全局替换 Go 源码中的 import 路径：`github.com/usememos/memos` → `github.com/usememos/memodo`
- [x] 1.3 更新 `proto/gen/` 中生成代码的 import 引用路径
- [x] 1.4 更新 `buf.gen.yaml` 中的 go_package 映射（如果包含 memos 路径）
- [x] 1.5 运行 `go mod tidy` 更新 go.sum
- [x] 1.6 运行 `go build ./...` 验证编译通过

## 2. CLI 命令名 & 二进制名

- [x] 2.1 修改 `cmd/memos/` 目录名为 `cmd/memodo/`（如适用）或保持目录结构不变仅更新命令注册
- [x] 2.2 修改 Cobra 根命令的 `Use` 字段（`cmd/memos/main.go` 或对应文件）：`memos` → `memodo`
- [x] 2.3 更新 contrib/completion/ 等路径中的 CLI 名称引用
- [x] 2.4 验证 `go build -o memodo ./cmd/memodo` 可正常编译

## 3. 版本 & 身份字符串

- [x] 3.1 更新 `internal/version/` 包中项目相关的显示名称（如有硬编码）
- [x] 3.2 搜索代码中硬编码的 `"memos"` 字符串（排除正确的 import 引用），改为 `"memodo"`
- [x] 3.3 搜索 `usememos/memos` 字符串（除 import 外），改为 `usememos/memodo`

## 4. 前端

- [x] 4.1 更新 `web/package.json` 中的 `name` 字段：`memos` → `memodo`
- [x] 4.2 更新前端构建输出目录名或相关配置（如有引用项目名的地方）
- [x] 4.3 搜索前端代码中硬编码的 `"memos"` 显示字符串

## 5. Docker & CI/CD

- [x] 5.1 更新 `scripts/Dockerfile` 中镜像名和路径引用（如 `memos` → `memodo`）
- [x] 5.2 更新 `scripts/entrypoint.sh` 中的路径名
- [x] 5.3 更新 `.github/workflows/` 中的所有 CI/CD 工作流文件中引用的二进制名和镜像名
- [x] 5.4 更新 `scripts/Dockerfile` 中 `-X github.com/usememos/memos/internal/version.Version` 的 ldflags

## 6. 文档

- [x] 6.1 更新根目录 README.md
- [x] 6.2 搜索所有 `.md` 文件中的 `memos` 引用（排除 proto 和 changelog 中不相关的），更新项目名

## 7. 验证

- [x] 7.1 运行 `go test ./...` 全部测试通过
- [x] 7.2 构建前端 `pnpm release` 正常
- [x] 7.3 全量编译检查：`go build ./cmd/memodo` 成功
- [x] 7.4 搜索编译产物中不应出现的旧名称字符串（如 `strings memodo | grep -i memos` 排除预期出现的位置）

## 8. Docker 镜像构建 & 发布

- [x] 8.1 `pnpm release` 构建前端
- [x] 8.2 `podman build -f scripts/Dockerfile -t docker.io/<user>/memodo:latest .` 构建镜像
- [x] 8.3 `podman login docker.io` 登录 Docker Hub
- [x] 8.4 `podman push docker.io/<user>/memodo:latest` 推送到 Docker Hub
