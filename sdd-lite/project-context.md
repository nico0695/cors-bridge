# Project Context

## Metadata

- project_name: rss-proxy
- project_root: /Users/nicolasschmidt/Documents/develop/proxy_cors
- runtime_root: ./sdd-lite
- generated_at: 2026-08-02T00:00:00Z
- generated_by: sddl-init

## Stack Summary

| Area | Value | Evidence |
|---|---|---|
| languages | TypeScript (strict, ES modules, NodeNext) | tsconfig.json, package.json `"type": "module"` |
| frameworks | Express (HTTP), TypeORM (SQLite persistence), Jest (tests) | package.json dependencies |
| runtime | Node.js >=18.19.0 | package.json `engines` |
| package_manager | npm | package-lock.json present |

## Important Directories

| Path | Role | Notes |
|---|---|---|
| src/domain | Core business entities (Feed, User, MockEndpoint, ProxyEndpoint) | Framework-independent |
| src/application/services | Business logic (RssService, UserService, ProxyEndpointService, etc.) | Depends only on domain + repository interfaces |
| src/application/repositories | Repository interfaces | Implemented by infrastructure layer |
| src/infrastructure/repositories | SQLite/in-memory repository implementations | TypeORM-backed persistence |
| src/infrastructure/utils | FeedParser and other infra utilities | |
| src/presentation/controllers | HTTP controllers per feature (RSS, Feed, Auth, Mock, Proxy) | |
| src/presentation/middleware | authMiddleware (JWT) | |
| src/presentation/server.ts | App entry point, DI wiring | |
| public | Static frontend (mock/proxy management UIs) | Served by Express |
| data | SQLite database files (main.db, mock-endpoints.db, proxy-endpoints.db) | Runtime-generated |
| src/application/services/__tests__ | Jest unit tests | UserService, MockEndpointService, ProxyEndpointService |

## Key Docs

| Path | Role | Notes |
|---|---|---|
| CLAUDE.md | Primary architecture and workflow guidance for AI assistants | Authoritative source for this project's conventions |
| FRONTEND_GUIDE.md | Frontend/static UI guidance | Present at repo root |
| docs/ | Additional project documentation | Contents not individually enumerated during shallow scan |

## Quality Commands

| Command Type | Candidate Commands | Evidence |
|---|---|---|
| install | npm install | package-lock.json |
| test | npm test (jest, experimental VM modules) | package.json scripts.test |
| build | npm run build (tsc) | package.json scripts.build |
| lint | npm run lint (eslint .) | package.json scripts.lint, .eslintrc.json |
| typecheck | npx tsc --noEmit (no dedicated script found) | tsconfig.json present, no scripts.typecheck |
| format | npm run format (prettier --write .) | package.json scripts.format, .prettierrc.json |

## Conventions

- Persisted bootstrap and change artifacts stay in English.
- Chat language may differ from artifact language (chat_language: es, inferred from user messages).
- Clean Architecture with strict dependency injection: domain -> application -> infrastructure/presentation.
- ES modules only; all relative imports require explicit `.js` extension even for `.ts` source files.
- Structured logging via pino; `no-console: warn` enforced by ESLint.
- `@typescript-eslint/no-unused-vars: error`, `eqeqeq: error`, strict TypeScript mode enabled.

## Risks And Unknowns

- No dedicated `typecheck` npm script exists; `tsc` is invoked only through `build`. Downstream stages needing a typecheck-only command should use `npx tsc --noEmit` unless the user adds a script.
- `docs/` directory contents were not individually enumerated in this shallow scan; revisit if a stage needs specific doc references.
- No Codex-specific configuration (`AGENTS.md`, `.codex/`) existed prior to this bootstrap; it was created as part of AI setup, not detected from prior repo evidence.
