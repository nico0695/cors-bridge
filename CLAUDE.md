# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-purpose API server built with Node.js, Express, and TypeScript that provides:

1. **RSS Proxy:** Fetch RSS feeds while bypassing CORS restrictions with in-memory caching (5 minutes TTL)
2. **Feed Enhancement:** Transform, filter, merge, and enhance RSS feeds with full-text content extraction
3. **User Authentication & Management:** JWT-based authentication with user CRUD operations
4. **API Mock Server:** Create and manage mock API endpoints for testing and integration
5. **HTTP Proxy:** Configurable proxy endpoints that forward requests to upstream servers with full header/cookie/auth preservation

**Key Technologies:** Express, TypeScript, pino (logging), node-cache (in-memory caching), better-sqlite3 (SQLite database), node-fetch, cheerio (HTML parsing), fast-xml-parser (XML parsing), jsonwebtoken (JWT auth), dotenv (environment variables)

## Common Commands

### Development

```sh
npm run dev          # Start dev server with hot reloading (uses tsx and pino-pretty)
npm run build        # Compile TypeScript to dist/
npm start            # Run production build (node dist/presentation/server.js)
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm test             # Run tests with Jest
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Docker

```sh
docker build -t rss-proxy .
docker run -p 8080:8080 rss-proxy    # Docker exposes port 8080, not 3000
```

**Important:** The server runs on port 8080 by default (via `PORT` env var), not 3000. Docker explicitly uses port 8080.

## Architecture

The project follows **Clean Architecture** with strict dependency injection:

```
src/
├── domain/                   # Core business entities
│   ├── Feed.ts              # Feed interface (data + contentType)
│   ├── FeedItem.ts          # FeedItem and ParsedFeed interfaces
│   ├── MockEndpoint.ts      # Mock endpoint interface
│   ├── ProxyEndpoint.ts     # Proxy endpoint interface
│   └── User.ts              # User interface and types
├── application/             # Business logic layer
│   ├── repositories/
│   │   ├── FeedRepository.ts        # Repository interface (findByUrl, save)
│   │   ├── MockEndpointRepository.ts # Mock endpoint repository interface
│   │   ├── ProxyEndpointRepository.ts # Proxy endpoint repository interface
│   │   └── UserRepository.ts        # User repository interface
│   └── services/
│       ├── RssService.ts            # RSS service
│       ├── FeedTransformService.ts  # Filter, sort, merge feeds
│       ├── ContentEnhancementService.ts # Full-text content extraction
│       ├── FormatConversionService.ts   # Convert between RSS/Atom/JSON
│       ├── MockEndpointService.ts   # Mock endpoint service
│       ├── ProxyEndpointService.ts  # Proxy endpoint service
│       └── UserService.ts           # User authentication and management
├── infrastructure/          # External implementations
│   ├── repositories/
│   │   ├── InMemoryFeedRepository.ts      # Implements FeedRepository with NodeCache
│   │   ├── SqliteMockEndpointRepository.ts # Implements MockEndpointRepository with SQLite
│   │   ├── SqliteProxyEndpointRepository.ts # Implements ProxyEndpointRepository with SQLite
│   │   └── SqliteUserRepository.ts        # Implements UserRepository with SQLite
│   └── utils/
│       └── FeedParser.ts            # RSS/Atom/JSON feed parsing utilities
└── presentation/            # HTTP layer
    ├── controllers/
    │   ├── RssController.ts           # Handles /rss endpoint
    │   ├── FeedController.ts          # Handles /api/feed/* endpoints
    │   ├── MockManagementController.ts # Handles /api-mock/endpoints CRUD
    │   ├── MockApiController.ts        # Handles /api-mock/serve/* endpoints
    │   ├── ProxyManagementController.ts # Handles /api-proxy/endpoints CRUD
    │   ├── ProxyApiController.ts       # Handles /api-proxy/serve/* forwarding
    │   ├── AuthController.ts          # Handles /api-auth/login and /api-auth/refresh
    │   └── UserController.ts          # Handles /api-auth/users CRUD
    ├── middleware/
    │   └── authMiddleware.ts          # JWT authentication middleware
    └── server.ts                       # App entry point with DI setup
```

### Dependency Flow

- **Presentation** depends on **Application**
- **Application** defines interfaces; **Infrastructure** implements them
- **Domain** is completely independent
- Dependencies are injected at startup in `server.ts` (lines 59-86)

### Key Components

**InMemoryFeedRepository** (`src/infrastructure/repositories/InMemoryFeedRepository.ts`):

- Implements caching with NodeCache (TTL: 300s, max 100 keys)
- Fetches feeds with node-fetch when cache misses
- Logs cache hits/misses with pino
- Exposes `getStats()` for health endpoint

**Server Entry** (`src/presentation/server.ts`):

- Dependency injection for RSS, Feed Enhancement, User Auth, Mock API, and Proxy API features
- Serves static files from `public/` directory
- Auto-creates default admin user from environment variables on startup
- Routes:
  - `/` - Serve index.html
  - `/rss?url=...` - RSS proxy endpoint
  - `/api/feed/transform` - Transform feeds (filter, sort, limit)
  - `/api/feed/merge` - Merge multiple feeds
  - `/api/feed/enhance` - Enhance feeds with full-text content
  - `/api-auth/login` - User login (returns JWT token)
  - `/api-auth/refresh` - Refresh JWT token
  - `/api-auth/register` - Public user registration (users start as blocked)
  - `/api-auth/users` - User CRUD operations (requires authentication)
  - `/api-mock/endpoints` - Mock endpoint CRUD operations
  - `/api-mock/serve/*` - Serve configured mock responses
  - `/api-proxy/endpoints` - Proxy endpoint CRUD operations
  - `/api-proxy/serve/*` - Forward requests to configured upstream servers
  - `/health` - Health check with stats
- Health endpoint returns uptime, memory usage, and cache stats
- Resolves `public` path dynamically for both dev (`tsx`) and prod (`node dist`) execution

**Logging:** All components use pino with custom formatting (ISO timestamps, custom level labels)

## Feed Enhancement Features

The server provides advanced feed manipulation capabilities including filtering, sorting, merging, format conversion, and full-text content extraction.

### Key Components

**FeedTransformService** (`src/application/services/FeedTransformService.ts`):

- **Filter:** Filter feed items by keywords, date range, or categories
- **Sort:** Sort items by date or title (ascending/descending)
- **Merge:** Combine multiple feeds into a single feed sorted by date
- **Limit:** Limit the number of items returned

**ContentEnhancementService** (`src/application/services/ContentEnhancementService.ts`):

- Extracts full-text content from article links using cheerio
- Only fetches content when existing content is truncated (<200 chars)
- Gracefully handles extraction failures with logging

**FormatConversionService** (`src/application/services/FormatConversionService.ts`):

- Converts feeds between RSS 2.0, Atom 1.0, and JSON Feed formats
- Uses fast-xml-parser for XML generation
- Supports bidirectional conversion

**FeedParser** (`src/infrastructure/utils/FeedParser.ts`):

- Unified parser for RSS, Atom, and JSON Feed formats
- Auto-detects feed format and normalizes to common ParsedFeed structure
- Uses fast-xml-parser for XML parsing

### API Endpoints

- `GET /api/feed/transform?url=...&keywords=...&fromDate=...&sortBy=...&limit=...` - Transform and filter feeds
- `GET /api/feed/merge?urls[]=...&urls[]=...` - Merge multiple feeds
- `GET /api/feed/enhance?url=...` - Enhance feed with full-text content

### Example Usage

**Transform a feed:**
```
GET /api/feed/transform?url=https://example.com/feed.xml&keywords=tech&sortBy=date&order=desc&limit=10
```

**Merge multiple feeds:**
```
GET /api/feed/merge?urls[]=https://example.com/feed1.xml&urls[]=https://example.com/feed2.xml
```

**Enhance with full-text content:**
```
GET /api/feed/enhance?url=https://example.com/feed.xml
```

## User Authentication & Management

JWT-based authentication system with user CRUD operations and role-based access control.

### Key Components

**SqliteUserRepository** (`src/infrastructure/repositories/SqliteUserRepository.ts`):

- Persists users in SQLite database (`data/main.db`)
- Stores password hash and salt (not plaintext)
- Auto-creates database schema on initialization

**UserService** (`src/application/services/UserService.ts`):

- Implements secure password hashing with crypto.pbkdf2
- JWT token generation and validation with jsonwebtoken
- User CRUD operations with status management (enabled/blocked)
- Enforces business rules (unique usernames, password requirements)

**authMiddleware** (`src/presentation/middleware/authMiddleware.ts`):

- `requireAuth`: Validates JWT token and attaches user to request
- `attachAuthUserIfPresent`: Optional authentication for mixed endpoints
- Returns 401 for invalid/missing tokens, 403 for blocked users

**Default Admin User:**

- Auto-created on server startup from environment variables
- Refreshes password on each startup if user already exists
- Defaults to username "admin" with password "admin" if not configured

### API Endpoints

**Authentication:**

- `POST /api-auth/login` - Login with username/password, returns JWT token
- `POST /api-auth/refresh` - Refresh JWT token with existing valid token
- `POST /api-auth/register` - Public registration endpoint (users start as blocked)

**User Management (requires authentication):**

- `GET /api-auth/users` - List all users
- `POST /api-auth/users` - Create new user (requires admin auth)
- `PATCH /api-auth/users/:id` - Update user (password, email, status)
- `DELETE /api-auth/users/:id` - Delete user

### Example Usage

**Login:**
```json
POST /api-auth/login
{
  "name": "admin",
  "password": "admin"
}

Response:
{
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "name": "admin",
    "status": "enabled"
  }
}
```

**Authenticated Request:**
```
GET /api-auth/users
Authorization: Bearer eyJhbGc...
```

### Configuration

- **Database:** SQLite at `data/main.db`
- **Password Hashing:** PBKDF2 with 100,000 iterations, 64-byte keys
- **JWT Secret:** Set via `JWT_SECRET` environment variable (defaults to "change-me" for dev)
- **Default Admin:** Configure via `DEFAULT_ADMIN_NAME`, `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_ADMIN_EMAIL`
- **User Status:** "enabled" (can authenticate) or "blocked" (cannot authenticate)

### Testing

Tests are located in `src/application/services/__tests__/UserService.test.ts` and cover:

- User creation with password hashing
- Login and token generation
- Token validation
- User status enforcement
- CRUD operations

## API Mock Feature

The Mock API allows creating custom endpoints for testing and integration purposes.

### Key Components

**SqliteMockEndpointRepository** (`src/infrastructure/repositories/SqliteMockEndpointRepository.ts`):

- Persists mock endpoints in SQLite database (`data/mock-endpoints.db`)
- Automatically creates database schema on initialization
- Stores endpoint configuration including path, response data, status codes, and delays

**MockEndpointService** (`src/application/services/MockEndpointService.ts`):

- Enforces business rules (max 50 endpoints, unique paths)
- Normalizes paths with leading slash
- Provides CRUD operations and statistics

### Management UI

Access the management interface at `/mock-manage.html`:

- Create new mock endpoints with custom responses
- Configure response status codes (200, 404, 500, etc.)
- Add artificial delays (0-10000ms) to simulate slow responses
- Toggle endpoints on/off without deleting them
- Group related endpoints with Group ID
- Support for JSON, XML, plain text, and HTML responses
- Visual endpoint list with collapsible details
- Copy endpoint URLs to clipboard
- Real-time stats display (total, enabled, disabled, remaining)

### API Endpoints

**Management API:**

- `GET /api-mock/endpoints` - List all endpoints
- `GET /api-mock/endpoints/:id` - Get endpoint by ID
- `POST /api-mock/endpoints` - Create new endpoint
- `PATCH /api-mock/endpoints/:id` - Update endpoint
- `DELETE /api-mock/endpoints/:id` - Delete endpoint
- `GET /api-mock/stats` - Get statistics

**Mock API:**

- `ANY /api-mock/serve/*` - Serve configured mock response (supports all HTTP methods)

### Example Usage

1. Create a mock endpoint via UI or API:

```json
POST /api-mock/endpoints
{
  "name": "User List",
  "path": "/users",
  "responseData": {"users": [{"id": 1, "name": "John"}]},
  "contentType": "application/json",
  "statusCode": 200,
  "delayMs": 500,
  "enabled": true
}
```

2. Access the mock endpoint:

```
GET /api-mock/serve/users
```

### Configuration

- **Max Endpoints:** 50 (enforced in service layer)
- **Database:** SQLite at `data/mock-endpoints.db`
- **Delay Range:** 0-10000ms
- **Supported Content Types:** application/json, application/xml, text/plain, text/html

### Testing

Tests are located in `src/application/services/__tests__/MockEndpointService.test.ts` and cover:

- Endpoint creation with validation
- Path normalization
- Duplicate path detection
- Max endpoint limit enforcement
- CRUD operations
- Statistics calculation

## HTTP Proxy API

The HTTP Proxy API provides flexible HTTP proxying with three operational modes:
1. **Static Mode**: Pre-configured endpoints with fixed baseUrl
2. **Dynamic Mode**: Endpoints accept runtime URLs via `?url=` query parameter
3. **Direct Proxy Mode**: Ad-hoc proxying without endpoint configuration

Supports full header/cookie/auth forwarding, optional caching, delays, and status overrides for testing under different network conditions.

### Key Components

**SqliteProxyEndpointRepository** (`src/infrastructure/repositories/SqliteProxyEndpointRepository.ts`):

- Persists proxy endpoints in SQLite database (`data/proxy-endpoints.db`)
- Auto-migrates existing databases to support new fields
- Stores endpoint configuration including path, optional baseUrl, useCache flag, status overrides, and delays

**ProxyResponseCache** (`src/infrastructure/cache/ProxyResponseCache.ts`):

- In-memory caching with NodeCache (TTL: 300s, max 100 keys)
- Caches only successful responses (2xx status codes)
- Global cache shared across all endpoints (key = target URL)
- Provides cache hit/miss statistics

**ProxyEndpointService** (`src/application/services/ProxyEndpointService.ts`):

- Enforces business rules (max 50 endpoints, unique paths)
- Validates base URL format (must start with http:// or https://) when provided
- baseUrl is now optional for dynamic mode endpoints
- Validates status code override range (100-599)
- Validates delay range (0-10000ms)
- Normalizes paths with leading slash
- Provides CRUD operations and statistics

**ProxyApiController** (`src/presentation/controllers/ProxyApiController.ts`):

- Supports three proxy modes: direct, static, and dynamic
- Query parameter `?url=...` overrides endpoint baseUrl
- Forwards all HTTP methods (GET, POST, PUT, PATCH, DELETE, etc.)
- Forwards all request headers except hop-by-hop headers
- Forwards request body for POST/PUT/PATCH methods
- Forwards response headers and status codes from upstream
- Override mode: when statusCodeOverride is set, returns configured status without upstream call
- Optional per-endpoint caching with `useCache` flag

### API Endpoints

**Management API:**

- `GET /api-proxy/endpoints` - List all proxy endpoints
- `GET /api-proxy/endpoints/:id` - Get proxy endpoint by ID
- `POST /api-proxy/endpoints` - Create new proxy endpoint
- `PATCH /api-proxy/endpoints/:id` - Update proxy endpoint
- `DELETE /api-proxy/endpoints/:id` - Delete proxy endpoint
- `GET /api-proxy/stats` - Get statistics

**Proxy Service:**

- `ANY /api-proxy/serve?url=...` - Direct proxy (no config required)
- `ANY /api-proxy/serve/{path}` - Endpoint-based proxy (static or dynamic mode)
- `ANY /api-proxy/serve/{path}?url=...` - Dynamic override (runtime URL overrides endpoint baseUrl)

### Example Usage

**1. Direct Proxy Mode (No Configuration)**

```bash
# Proxy any URL without pre-configuration
GET /api-proxy/serve?url=https://api.github.com/users/octocat
```

**2. Static Endpoint with Caching**

```json
POST /api-proxy/endpoints
{
  "name": "GitHub API",
  "path": "/github",
  "baseUrl": "https://api.github.com",
  "enabled": true,
  "useCache": true
}
```

```bash
# First call fetches from upstream and caches
GET /api-proxy/serve/github

# Second call served from cache (faster)
GET /api-proxy/serve/github
```

**3. Dynamic Endpoint (No baseUrl)**

```json
POST /api-proxy/endpoints
{
  "name": "Dynamic Proxy",
  "path": "/dynamic",
  "delayMs": 1000,
  "useCache": false,
  "enabled": true
}
```

```bash
# Use with different URLs
GET /api-proxy/serve/dynamic?url=https://api.github.com/users
GET /api-proxy/serve/dynamic?url=https://jsonplaceholder.typicode.com/users
```

**4. Runtime URL Override**

```bash
# Override static baseUrl at runtime
GET /api-proxy/serve/github?url=https://api.gitlab.com/users
# Uses GitLab URL instead of configured GitHub baseUrl
```

**5. Simulate Errors Without Upstream**

```json
PATCH /api-proxy/endpoints/:id
{
  "statusCodeOverride": 500,
  "delayMs": 2000
}
```

Now `GET /api-proxy/serve/github` returns 500 status after 2s delay WITHOUT calling upstream.

### Configuration

- **Max Endpoints:** 50 (enforced in service layer)
- **Database:** SQLite at `data/proxy-endpoints.db`
- **Cache TTL:** 300 seconds (5 minutes)
- **Max Cache Keys:** 100
- **Delay Range:** 0-10000ms
- **Status Code Override Range:** 100-599 (when set, upstream is not called)
- **Default useCache:** false (opt-in per endpoint)

### Header Forwarding

**Request Headers (forwarded to upstream):**
- Authorization, Cookie, User-Agent, Accept, Content-Type, and all custom headers
- Skipped: Host, Connection, Content-Length, Transfer-Encoding, Upgrade, Keep-Alive

**Response Headers (forwarded to client):**
- Content-Type, Set-Cookie, and all other headers
- Skipped: Connection, Transfer-Encoding, Content-Encoding

### Use Cases

1. **Testing with authentication:** Proxy authenticated API calls while preserving JWT tokens and cookies
2. **Simulating network issues:** Add artificial delays to test slow network conditions
3. **Simulating server errors:** Use status code override to test error handling without affecting upstream
4. **CORS bypass:** Proxy requests to bypass CORS restrictions during development
5. **Dynamic proxying:** Use direct proxy mode or dynamic endpoints for ad-hoc API testing
6. **Performance testing:** Enable caching to reduce upstream load and improve response times

### Caching Behavior

- Only enabled when endpoint has `useCache: true`
- Only caches successful responses (status 200-299)
- Cache key is the full target URL
- Direct proxy mode never uses cache
- Cache is checked before applying endpoint delay
- TTL: 5 minutes (300 seconds)
- Max keys: 100 (LRU eviction)

### Migration Notes

Existing proxy endpoints are automatically migrated on server startup:
- `base_url` column becomes nullable
- `use_cache` column added (default: false)
- All existing endpoints retain their baseUrl and function as before
- Migration logs: "Migrating proxy_endpoints table..."
- Safe to run multiple times (checks if migration needed)
- **Recommendation:** Backup `data/proxy-endpoints.db` before first run with new code

### Testing

Tests are located in `src/application/services/__tests__/ProxyEndpointService.test.ts` and cover:

- Endpoint creation with validation
- Path normalization
- Duplicate path detection
- Base URL validation (http/https)
- Status code override validation
- Delay validation
- Max endpoint limit enforcement
- CRUD operations
- Statistics calculation

## Module System

- Uses ES modules (`"type": "module"` in package.json)
- All imports must include `.js` extension (even for `.ts` files)
- TypeScript config: `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`

## Configuration

### Environment Variables

The following environment variables can be configured (see `.env.example`):

- **PORT:** Server port (default: 8080)
- **JWT_SECRET:** Secret key for JWT token signing (default: "change-me" - change in production!)
- **DEFAULT_ADMIN_NAME:** Default admin username (default: "admin")
- **DEFAULT_ADMIN_PASSWORD:** Default admin password (default: "admin")
- **DEFAULT_ADMIN_EMAIL:** Default admin email (optional)

Create a `.env` file in the project root based on `.env.example` to configure these values.

### Application Settings

- **Cache TTL:** 300 seconds (hardcoded in `InMemoryFeedRepository.ts:19`)
- **Max cache keys:** 100 (hardcoded in `InMemoryFeedRepository.ts:19`)
- **Node version:** Requires >=18.19.0
- **Databases:**
  - `data/main.db` - User data
  - `data/mock-endpoints.db` - Mock endpoint configurations
  - `data/proxy-endpoints.db` - Proxy endpoint configurations

## Code Quality

- ESLint with TypeScript plugin and Prettier integration
- Key rules: `@typescript-eslint/no-unused-vars: error`, `no-console: warn`, `eqeqeq: error`
- Strict TypeScript mode enabled
- Use structured logging with pino instead of console

<!-- sdd-lite:start generated_at="2026-08-02T16:31:33Z" version="0.1" package_root="sdd-lite" -->
You are a development assistant with access to `sdd-lite`, a structured change workflow for bounded repo changes.

## When to use sdd-lite

Use the `sdd-lite` orchestrator (canonical contract at `sdd-lite/orchestrator/SDDL-ORCHESTRATOR.md`) when one of these is true:

- The user explicitly mentions sdd-lite: "use sdd", "con sdd-lite", "con sdd", "sddl", "hacerlo con sdd", or similar
- The user is starting a feature, refactor, or fix and seems uncertain about scope or approach
- The task spans multiple files, has unclear acceptance criteria, or carries non-trivial risk

Do NOT activate sdd-lite automatically for:

- Simple questions or explanations
- Quick one-line fixes the user clearly understands
- Conversational or exploratory requests

## When to suggest sdd-lite (without forcing it)

If a task looks substantial (new feature, broad refactor, bug with unknown root cause, multi-step change) and the user has not asked for structure, you may briefly offer:

> "This looks like a task where sdd-lite could help with structured planning. Want to use it, or should I proceed directly?"

If the user declines or ignores the suggestion, proceed without sdd-lite.

## When sdd-lite is active

Read and follow the canonical orchestration contract at `sdd-lite/orchestrator/SDDL-ORCHESTRATOR.md`.
That contract is the single source of truth for delegation rules, handoff envelopes, result processing, routing, approvals, and all operational behavior.

Use canonical skills under `sdd-lite/skills/`, runtime standards at `./sdd-lite/skill-catalog.md`, and schemas under `sdd-lite/schemas/`.

Rules:
- Run bootstrap preflight first. If bootstrap files are missing or unusable, stop and run `sddl-init`.
- Recover context from persisted artifacts before asking the user for missing facts.
- Persisted artifacts must remain in English. Chat interaction may be `es` or `en`.

## Platform: Claude Code

### Agent tool delegation

Delegation uses the native **Agent tool**. Each stage worker receives a fresh context via a dedicated Agent call. Pass the compact handoff envelope as the agent prompt. Do not use the Skill tool or Task tool for stage delegation.

`interactive` / `auto` controls pauses between stages only. It does not grant permission to bypass `stage_approval`, skip mandatory checkpoints, or omit approval gates for code-touching stages. These are always required regardless of execution mode.

### Parallelization

Parallelize only independent read-only tasks (e.g., `sddl-deep-explorer` alongside a non-writing stage) or workers with fully disjoint write scopes. Never parallelize workers that write to overlapping artifact paths.

### Review protocols

`sddl-code-review` lenses and `sddl-judgment-day` judges run as parallel read-only Agent workers per the Review Worker Envelope in `SDDL-ORCHESTRATOR.md`. Launch judgment-day judges in one parallel batch, wait for both results before merging, and never let one judge see the other's output. Review workers return `findings` only; the orchestrator writes `review-ledger.md`.

### Worker boundaries

Child workers launched via Agent tool must not launch additional sub-agents. If a worker discovers work beyond its assigned scope, it must return `partial` or `blocked` with a `next_action` — not a new Agent call.

### Fallback if Agent tool is unavailable

If Agent tool delegation is denied or unavailable (e.g., blocked by user permissions):

- State visibly that stages will run without fresh-context isolation.
- Persist `state.yaml` immediately after each stage completes before continuing.
- Apply all canonical result-processing, routing, and approval rules.
- When a mandatory delegation trigger fires, explain the degradation before continuing inline.
<!-- sdd-lite:end -->
