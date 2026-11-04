# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Memodo is an open-source, self-hosted note-taking and todo management tool. Go 1.26 backend (Echo v5, Connect RPC + gRPC-Gateway), React 18 + TypeScript 6 + Vite 7 frontend, Protocol Buffers API, SQLite/MySQL/PostgreSQL.

## Commands

```bash
# Backend
go run ./cmd/memodo --port 8081   # Start dev server
go test ./...                      # Run all tests
go test -v ./store/...             # Run store tests (all 3 DB drivers via TestContainers)
go test -v -race ./server/...      # Run server tests with race detection
go test -v -race ./internal/...    # Run internal package tests with race detection
go test -v -run TestFoo ./pkg/...  # Run a single test
go mod tidy -go=1.26.2             # Match CI tidy check
golangci-lint run                  # Lint (v2, config: .golangci.yaml)
golangci-lint run --fix            # Auto-fix lint issues (includes goimports)

# Frontend (cd web)
pnpm install                       # Install deps
pnpm dev                           # Dev server (:3001, proxies API to :8081)
pnpm lint                          # Type check + Biome lint
pnpm lint:fix                      # Auto-fix lint issues
pnpm format                        # Format code
pnpm build                         # Production build
pnpm release                       # Build to server/router/frontend/dist

# Protocol Buffers (cd proto)
buf generate                       # Regenerate Go + TypeScript + OpenAPI
buf lint                           # Lint proto files
buf format -w                      # Format proto files
```

## Architecture

```
cmd/memodo/main.go           # Cobra CLI + Viper config, server init

server/
├── server.go               # Echo v5 HTTP server, background runners
├── auth/                   # JWT access (15min) + refresh (30d) tokens, PAT
├── router/
│   ├── api/v1/             # 8 gRPC services (Connect + Gateway)
│   │   ├── acl_config.go   # Public endpoints whitelist
│   │   ├── sse_hub.go      # Server-Sent Events (live updates)
│   │   └── mcp/            # MCP server for AI assistants
│   ├── frontend/           # SPA static file serving
│   ├── fileserver/         # Native HTTP file server (thumbnails, range requests)
│   └── rss/                # RSS feeds
└── runner/                 # Background: memo payload processing, S3 presign refresh

store/
├── driver.go               # Database driver interface
├── store.go                # Store wrapper + in-memory cache (TTL 10min, max 1000)
├── migrator.go             # Migration logic (LATEST.sql for fresh, incremental for upgrades)
└── db/{sqlite,mysql,postgres}/  # Driver implementations

proto/
├── api/v1/                 # Service definitions (9 proto files)
├── store/                  # Internal storage messages
└── gen/                    # Generated Go, TypeScript, OpenAPI

internal/                   # app-private packages: scheduler, cron, email, filter (CEL),
                            # webhook, markdown (Goldmark), httpgetter, idp (OAuth2), storage/s3

web/src/
├── connect.ts              # Connect RPC client + auth interceptor + token refresh
├── auth-state.ts           # Token storage (localStorage + BroadcastChannel cross-tab)
├── contexts/               # AuthContext, InstanceContext, ViewContext, MemoFilterContext
├── hooks/                  # React Query hooks (useMemoQueries, useUserQueries, etc.)
├── lib/query-client.ts     # React Query v5 (staleTime: 30s, gcTime: 5min)
├── router/index.tsx        # Route definitions
├── components/             # UI components (Radix UI primitives, MemoEditor, Settings, etc.)
├── themes/                 # CSS themes (default, dark, paper) — OKLch color tokens
└── pages/                  # Page components
```

## Conventions

### Go
- **Errors:** `errors.Wrap(err, "context")` from `github.com/pkg/errors`. Never `fmt.Errorf` (lint-enforced via forbidigo).
- **gRPC errors:** `status.Errorf(codes.X, "message")` from service methods.
- **Imports:** stdlib, then third-party, then local (`github.com/usememos/memodo`). Enforced by goimports (runs as golangci-lint formatter).
- **Comments:** All exported functions must have doc comments (godot enforced).

### Frontend
- **Imports:** Use `@/` alias for absolute imports.
- **Formatting:** Biome — 140 char lines, double quotes, always semicolons, 2-space indent.
- **State:** Server data via React Query hooks (`hooks/`). Client state via React Context (`contexts/`).
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`), `cn()` utility (clsx + tailwind-merge), CVA for variants.

### Database & Proto
- **DB changes:** Migration files for all 3 drivers + update `LATEST.sql`.
- **Proto changes:** Run `buf generate`. Generated code: `proto/gen/` and `web/src/types/proto/`.
- **Public endpoints:** Add to `server/router/api/v1/acl_config.go`.

## CI

One workflow: `.github/workflows/build-image.yml` builds and publishes the container image to
GitHub Container Registry. It authenticates with the built-in `GITHUB_TOKEN` (`packages: write`),
so **no repository secrets are required**.

Every run publishes exactly **one** tag — `<YYYYMMDD>-<short sha>` — with the date in
Asia/Shanghai and an 8-character commit hash, matching the images already used on the NAS:

```
ghcr.io/<owner>/<repo>:20261104-6e56f271     # currently ghcr.io/iridesc/memos
```

No `canary` / `latest` / semver aliases are pushed. The same string is passed as the build
`VERSION`, so `GetInstanceProfile` reports a version that maps 1:1 onto the image tag.

Triggers: push `main`, push tag `v*.*.*`, or `workflow_dispatch` — all produce the same single tag.
Pulling a private package needs `docker login ghcr.io`; the NAS ships images by load instead of pull.

There is no test/lint workflow — run verification locally before pushing:

```bash
cd web && pnpm lint && pnpm test && pnpm release && cd ..
go test ./...
```

The workflow runs `pnpm release` before the Docker build because `server/router/frontend` embeds
`dist/*` via `go:embed`.

**Docker:** Multi-stage (`scripts/Dockerfile`), Alpine 3.21, non-root user, port 5230, multi-arch (amd64/arm64)
- **Container Build:** `podman build --platform linux/amd64 -f scripts/Dockerfile -t docker.io/irid/memodo:latest .`
- **Container Push:** `podman push docker.io/irid/memodo:latest`
