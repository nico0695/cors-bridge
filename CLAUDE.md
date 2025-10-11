# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RSS proxy server built with Node.js, Express, and TypeScript that allows fetching RSS feeds while bypassing CORS restrictions. The server fetches feeds, caches them in memory for 5 minutes (300s), and returns them with appropriate CORS headers.

**Key Technologies:** Express, TypeScript, pino (logging), node-cache (in-memory caching), node-fetch

## Common Commands

### Development
```sh
npm run dev          # Start dev server with hot reloading (uses tsx and pino-pretty)
npm run build        # Compile TypeScript to dist/
npm start            # Run production build (node dist/presentation/server.js)
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
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
│   └── Feed.ts              # Feed interface (data + contentType)
├── application/             # Business logic layer
│   ├── repositories/
│   │   └── FeedRepository.ts   # Repository interface (findByUrl, save)
│   └── services/
│       └── RssService.ts       # Service that uses repository
├── infrastructure/          # External implementations
│   └── repositories/
│       └── InMemoryFeedRepository.ts  # Implements FeedRepository with NodeCache
└── presentation/            # HTTP layer
    ├── controllers/
    │   └── RssController.ts    # Handles /rss endpoint
    └── server.ts               # App entry point with DI setup
```

### Dependency Flow
- **Presentation** depends on **Application**
- **Application** defines interfaces; **Infrastructure** implements them
- **Domain** is completely independent
- Dependencies are injected at startup in `server.ts:23-26`

### Key Components

**InMemoryFeedRepository** (`src/infrastructure/repositories/InMemoryFeedRepository.ts`):
- Implements caching with NodeCache (TTL: 300s, max 100 keys)
- Fetches feeds with node-fetch when cache misses
- Logs cache hits/misses with pino
- Exposes `getStats()` for health endpoint

**Server Entry** (`src/presentation/server.ts`):
- Dependency injection happens at lines 24-26
- Serves static files from `public/` directory
- Routes: `/` (index.html), `/rss?url=...` (proxy), `/health` (stats)
- Health endpoint returns uptime, memory usage, and cache stats
- Resolves `public` path dynamically for both dev (`tsx`) and prod (`node dist`) execution

**Logging:** All components use pino with custom formatting (ISO timestamps, custom level labels)

## Module System

- Uses ES modules (`"type": "module"` in package.json)
- All imports must include `.js` extension (even for `.ts` files)
- TypeScript config: `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`

## Configuration

- **Port:** Set via `PORT` environment variable (default: 8080)
- **Cache TTL:** 300 seconds (hardcoded in `InMemoryFeedRepository.ts:19`)
- **Max cache keys:** 100 (hardcoded in `InMemoryFeedRepository.ts:19`)
- **Node version:** Requires >=18.19.0

## Code Quality

- ESLint with TypeScript plugin and Prettier integration
- Key rules: `@typescript-eslint/no-unused-vars: error`, `no-console: warn`, `eqeqeq: error`
- Strict TypeScript mode enabled
- Use structured logging with pino instead of console
