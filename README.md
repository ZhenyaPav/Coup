# Coup: Human vs AI (TypeScript Monorepo)

Implements a two-player Coup game with:

- shared deterministic game engine (`packages/game-logic`)
- HTTP API for AI + UI clients (`apps/server`)
- web UI for the human player (`apps/web`)
- AI playbook/rules doc in Markdown (`docs/coup-rules.md`)

## Requirements

- Node.js 22+
- pnpm 9+
- Docker (for container tests/deploy)

## Install

```bash
pnpm install
```

## Run locally

Terminal 1:

```bash
pnpm dev:server
```

Terminal 2:

```bash
pnpm dev:web
```

Open `http://localhost:5173`.

## Build

```bash
pnpm build
```

## Automated tests

Run all package tests:

```bash
pnpm test
```

This includes:

- game-logic unit tests (action/challenge/block flows)
- server integration tests (`/api` behavior)
- web UI tests (bootstrap render + waiting/turn states)

## Test Without Local Node/npm/pnpm

Run the full monorepo test suite inside Docker:

```bash
sh deploy/test-suite-docker.sh
```

This does not require installing Node.js, npm, or pnpm on your system.

## API quick reference

- `POST /api/game/new`
- `GET /api/game/state?viewer=human|ai`
- `POST /api/game/action`
- `GET /api/rules` (serves `docs/coup-rules.md` as markdown)
- `GET /api/health`

Out-of-turn action returns `409` with `{ code: "NOT_YOUR_TURN" }`.

## AI loop example

1. `GET /api/game/state?viewer=ai`
2. If `state.isYourTurn` is false, wait and retry.
3. Choose one move from `state.legalMoves`.
4. `POST /api/game/action` with `{ viewer: "ai", move }`.

## Docker

Build image:

```bash
docker build -f deploy/Dockerfile -t coup-app .
```

Run container:

```bash
docker run --rm -p 8080:8080 coup-app
```

Open `http://localhost:8080`.

Docker smoke test:

```bash
sh deploy/test-docker.sh
```

## Docker Compose

```bash
docker compose -f deploy/docker-compose.yml up --build
```

Service is exposed on `http://localhost:8080`.

Compose smoke test:

```bash
sh deploy/test-compose.sh
```

## Kubernetes

Deploy with Helm:

```bash
helm upgrade --install coup ./deploy/helm/coup
```

See `deploy/helm/coup/README.md` for image tags, ingress, and private GHCR pulls.
