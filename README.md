# Memodo

Open-source, self-hosted **memo + todo** management tool. Built on top of [Memos](https://github.com/usememos/memos), adding full task/todo capabilities to the original note-taking experience.

[![Docker](https://img.shields.io/badge/🐳-Docker-blue?style=flat-square)](https://hub.docker.com/r/neosmemo/memodo)

## Features

- **All Memos features** — Timeline-first capture, Markdown-native notes, total data ownership
- **Todo/Task Management** — Plan time, completion states, today panel with drag-to-reorder
- **Instant Capture** — Open, write, done — no folders to navigate.
- **Total Data Ownership** — Self-hosted on your infrastructure. Zero telemetry.
- **Radical Simplicity** — Single Go binary, ~20MB Docker image. One command to deploy with SQLite, MySQL, or PostgreSQL.
- **Open & Extensible** — MIT-licensed with full REST and gRPC APIs for integration.

## Quick Start

### Docker (Recommended)

```bash
docker run -d \
  --name memodo \
  -p 5230:5230 \
  -v ~/.memodo:/var/opt/memos \
  neosmemo/memodo:latest
```

Open `http://localhost:5230` and start writing!

### Native Binary

```bash
curl -fsSL https://raw.githubusercontent.com/usememos/memodo/main/scripts/install.sh | sh
```

### Build from Source

```bash
# Build frontend
cd web && pnpm install && pnpm release && cd ..

# Build backend
go build -o memodo ./cmd/memodo

# Run
./memodo --port 8081
```

## Credits

Memodo is a fork of [Memos](https://github.com/usememos/memos) — an open-source, self-hosted note-taking tool. All original Memos features and contributions are credited to the upstream project.

## License

Memodo is open-source software licensed under the [MIT License](LICENSE).
