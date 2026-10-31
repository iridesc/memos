# NAS 部署环境（绿联 UGOS Pro）

本文件记录 memodo 生产实例的部署环境与操作要点，供 agent 参考。
**密码等凭据不入库**，保存在本机 `~/.config/memodo/nas.env`（600 权限）。

---

## 1. 连接信息

| 项 | 值 |
|---|---|
| 主机 | `2408:8270:a71:7d0:a47c:e513:20f2:156f` |
| 域名 | `direct.disk.irid.cc`（CNAME 同 `disk.irid.cc`） |
| 用户 | `Irid` |
| 密码 | 见 `~/.config/memodo/nas.env` |
| 系统 | Debian 12 (bookworm) / 绿联 UGOS Pro，kernel 6.18.15，x86_64 |
| 站点 | https://memodo.irid.cc （由 NAS 上的 caddy 反代） |

**该 NAS 只有 IPv6 记录（AAAA），没有 A 记录**，必须走 IPv6。
从外网访问时，本机的 IPv6 流量可能被 sing-box / onexray 的 TUN 劫持导致连接被 reset；
出现 `kex_exchange_identification: read: Connection reset by peer` 时先排查本机 TUN 代理。

### 常用命令

```bash
# 读取凭据并连接
source ~/.config/memodo/nas.env
SSHPASS="$NAS_PASSWORD" sshpass -e ssh -6 \
  -o StrictHostKeyChecking=accept-new \
  -o PreferredAuthentications=password -o PubkeyAuthentication=no \
  "$NAS_USER@$NAS_HOST" 'docker ps'

# 上传文件（关键：UGOS 没有 SFTP 子系统，scp 会失败）
cat localfile | SSHPASS="$NAS_PASSWORD" sshpass -e ssh -6 \
  -o PreferredAuthentications=password -o PubkeyAuthentication=no \
  "$NAS_USER@$NAS_HOST" 'cat > /volume1/docker/memodo/releases/xxx.tar.gz'
```

### 已知的连接坑

- **没有 SFTP 子系统**：`scp` 直接报 `Connection closed`（走的是 sftp 协议）。用 `ssh 'cat > file'` 管道，实测 24MB / 2.6 秒。
- **IPv6 地址带冒号**：即便 `scp` 可用，IPv6 目标也必须写成 `user@[addr]:path`。
- **sudo 需要密码**：普通用户 `Irid` 不能免密 sudo。
- **NAS 自带工具**：`sqlite3`、`tar`、`curl`、`python3` 都有，可直接用来做数据校验。

---

## 2. NAS 上的 Docker 环境

| 项 | 值 |
|---|---|
| Docker | 29.6.2 |
| Compose | v5.1.3（`docker compose`，v2 子命令形式） |
| data-root | `/volume1/@docker` |
| 已有容器 | `memodo`、`caddy`、`pi-box`、`productdb`、`productdb-postgres`、`hermes`、`reclone-webdav`、`ddns-go` |

### 关键坑：daemon 配了失效的 HTTP 代理

`/etc/docker/daemon.json` 里配了 `proxies.http-proxy` / `https-proxy`，指向 NAS 自己的
`192.168.1.2:8101`（带用户名密码）。**该端口当前不可达，因此 `docker pull` 全部失败**：

```
docker: Error response from daemon: Get "https://registry-1.docker.io/v2/": proxyconnect tcp: dial tcp 192.168.1.2:8101: connect: connection refused
```

对策：**不要在 NAS 上 pull**。在本地打好镜像包 → 传到 NAS → `docker load`。
`docker load` / `docker tag` / `docker compose` 不走代理，不受影响。

（若要修：删掉 `daemon.json` 里的 `proxies` 段后 `systemctl restart docker`，或让 8101 端口的代理重新可用。）

---

## 3. memodo 部署布局

```
/volume1/docker/memodo/
├── docker-compose.yaml        # 当前生效的编排文件（用 image: irid/memodo:<tag>）
├── memodo-data/               # 数据卷（sqlite），容器内映射到 /var/opt/memos，owner=10001
├── releases/<tag>/            # 发布物：镜像 tar.gz、compose 副本
└── backups/<tag>/             # 部署前备份：persistent-data.tar.gz、docker-compose.yaml、memo-count.txt
```

当前 compose（与 caddy 通过外部网络 `caddy-network` 互联，caddy 负责 443 反代）：

```yaml
services:
    memodo:
      image: irid/memodo:<tag>
      container_name: memodo
      expose:
        - "5230"
      volumes:
        - ./memodo-data:/var/opt/memos
      restart: unless-stopped
      networks:
       - caddy-network

networks:
 caddy-network:
   external: true
```

### 版本化部署流程（沿用 20261025 / 20261027 / 20261101 三次实践）

1. 本地 `pnpm release` 产出前端 → `server/router/frontend/dist`
2. 交叉编译 amd64 静态二进制 → 打成 runtime 镜像（`scripts/Dockerfile` 的 monolithic 段）
3. `podman save | gzip` → 传到 `/volume1/docker/memodo/releases/` → 校验 sha256
4. NAS 侧：记录旧状态 → 打 rollback 标签 → `docker stop` → 备份 `memodo-data` → `docker load`
   → 改 compose 的 image tag → `docker compose up -d --pull never --no-build`
5. 校验：容器内 `/healthz` → Connect `GetInstanceProfile` 的 `commit` 必须与预期一致
   → `PRAGMA quick_check` = ok → memo 行数与部署前一致
6. 任一步失败自动回滚：compose 改回 rollback 镜像并 `up -d`

参考脚本：`build/deploy-20261101/deploy-nas.sh`（`build/` 目录被 gitignore，需长期保存请自行归档）。

### 镜像标签约定

- `<YYYYMMDD>-<短 commit>`：正式发布
- `rollback-<新 tag>`：**指向部署前正在运行的镜像**（不是新镜像）
- `latest`：历史遗留，指向 20261025 的镜像，不要依赖

---

## 4. 构建注意事项（踩过的坑）

- **`${VAR}` 会被提前展开**：写成一行 `VERSION=x go build -ldflags="...${VERSION}"` 时，
  shell 在赋值生效前就展开了 `${VERSION}`，导致 version/commit 写成空字符串，
  镜像对外报告的 `commit` 为空、部署校验永远不过。**先 `export` 再执行 build**。

- **验证要用 `commit` 而不是 `version`**：`GetInstanceProfile` 同时返回 `version` 和 `commit`，
  `commit` 形如 `c0f8d31d-local-20261101`，唯一且可断言。

- **本机构建环境**：Apple Silicon macOS，用 `podman machine`（QEMU）做 `--platform linux/amd64`；
  Go 二进制直接本机交叉编译（`CGO_ENABLED=0 GOOS=linux GOARCH=amd64`），比在 QEMU 里跑 `go build` 快得多。
  运行时镜像只需 alpine:3.21 + `tzdata ca-certificates su-exec`。

- **`.dockerignore` 里排除了 `build/`**，所以镜像上下文要用独立目录（如 `build/imgctx/`）。

- **`server/router/frontend/dist/assets/` 被 gitignore**，仓库里只跟踪 `dist/index.html`。
  改动前端后需要 `pnpm release` 并提交更新后的 `index.html`。

---

## 5. 数据与回滚

- sqlite 主库：`/volume1/docker/memodo/memodo-data/memos_prod.db`（WAL 模式，另有 `-wal` / `-shm`）
- schema 版本记录在 `system_setting` 表的 `BASIC` 行（`schemaVersion`，当前 0.31.1）
- 备份产物：`backups/<tag>/persistent-data.tar.gz`（`tar -czf ... -C /volume1/docker/memodo memodo-data`）
- 回滚：compose 的 image 改成 `irid/memodo:rollback-<tag>` 后 `docker compose up -d`；
  若数据也被改坏，用对应 `persistent-data.tar.gz` 覆盖 `memodo-data/` 再启动
- **不要用 `rm -rf memodo-data` 覆盖恢复**：目录 owner 是 `10001:10001`，`Irid` 无权删除其中的文件，
  会导致 `Permission denied` + tar 恢复失败。恢复前先 `sudo chown` 或改为覆盖式解包。
