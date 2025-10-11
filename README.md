# RSS Proxy

A powerful RSS proxy server with advanced features including feed transformation, filtering, format conversion, and content enhancement.

## Features

- **CORS Bypass**: Fetch RSS feeds without CORS restrictions
- **Feed Transformation & Filtering**: Filter by keywords, date ranges, and categories
- **Format Conversion**: Convert between RSS, Atom, and JSON Feed formats
- **Content Enhancement**: Extract full article content and add metadata
- **Feed Merging**: Combine multiple RSS feeds into one
- **Caching**: Built-in in-memory caching (5 minutes TTL)
- **TypeScript**: Fully typed with clean architecture

## Quick Start

### Installation

```sh
npm install
```

### Development

```sh
npm run dev       # Start dev server with hot reloading
npm run build     # Compile TypeScript
npm start         # Run production build
npm test          # Run tests
```

### Docker

```sh
docker build -t rss-proxy .
docker run -p 8080:8080 rss-proxy
```

## API Endpoints

### Basic Proxy

**Endpoint**: `/rss`

Fetch an RSS feed with CORS headers.

```
GET /rss?url=https://feeds.bbci.co.uk/news/rss.xml
```

### Feed Transformation & Filtering

**Endpoint**: `/api/feed/transform`

Transform and filter RSS feeds with advanced options.

**Query Parameters**:

- `url` (required) - RSS feed URL
- `keywords` - Filter items containing these keywords (comma-separated)
- `exclude` - Exclude items containing these keywords (comma-separated)
- `fromDate` - Filter items after this date (ISO 8601 format)
- `toDate` - Filter items before this date (ISO 8601 format)
- `categories` - Filter by categories (comma-separated)
- `limit` - Limit number of items returned
- `sortBy` - Sort by `date` or `title`
- `order` - Sort order: `asc` or `desc` (default: `desc`)
- `format` - Output format: `rss`, `atom`, or `json` (default: `rss`)

**Examples**:

```sh
# Filter by keywords and limit to 5 items
GET /api/feed/transform?url=https://feeds.bbci.co.uk/news/rss.xml&keywords=tech,science&limit=5

# Filter by date range
GET /api/feed/transform?url=https://example.com/feed.xml&fromDate=2024-01-01T00:00:00Z&toDate=2024-01-31T23:59:59Z

# Convert to JSON Feed format
GET /api/feed/transform?url=https://example.com/feed.xml&format=json

# Sort by title and exclude certain keywords
GET /api/feed/transform?url=https://example.com/feed.xml&exclude=politics&sortBy=title&order=asc
```

### Feed Merging

**Endpoint**: `/api/feed/merge`

Combine multiple RSS feeds into a single feed.

**Query Parameters**:

- `urls` (required) - Comma-separated list of feed URLs
- `limit` - Limit number of items in merged feed
- `format` - Output format: `rss`, `atom`, or `json` (default: `rss`)

**Example**:

```sh
# Merge two feeds and return as Atom
GET /api/feed/merge?urls=https://feed1.com/rss,https://feed2.com/rss&limit=20&format=atom
```

### Content Enhancement

**Endpoint**: `/api/feed/enhance`

Extract full article content from source URLs and add metadata (reading time).

**Query Parameters**:

- `url` (required) - RSS feed URL
- `format` - Output format: `rss`, `atom`, or `json` (default: `rss`)

**Example**:

```sh
# Enhance feed with full article content
GET /api/feed/enhance?url=https://example.com/feed.xml&format=json
```

### Health Check

**Endpoint**: `/health`

Returns server health status, uptime, memory usage, and cache statistics.

```sh
GET /health
```

## Architecture

This project follows Clean Architecture principles with clear separation of concerns:

```
src/
├── domain/                   # Core business entities
│   ├── Feed.ts              # Feed interface
│   └── FeedItem.ts          # Feed item structures
├── application/             # Business logic layer
│   ├── repositories/        # Repository interfaces
│   └── services/            # Business services
│       ├── RssService.ts
│       ├── FeedTransformService.ts
│       ├── FormatConversionService.ts
│       └── ContentEnhancementService.ts
├── infrastructure/          # External implementations
│   ├── repositories/
│   │   └── InMemoryFeedRepository.ts
│   └── utils/
│       └── FeedParser.ts
└── presentation/            # HTTP layer
    ├── controllers/
    │   ├── RssController.ts
    │   └── FeedController.ts
    └── server.ts
```

## Configuration

- **Port**: Set via `PORT` environment variable (default: `8080`)
- **Cache TTL**: 300 seconds (5 minutes)
- **Max cache entries**: 100

## Technologies

- **Express** - Web framework
- **TypeScript** - Type-safe development
- **pino** - Structured logging
- **node-cache** - In-memory caching
- **fast-xml-parser** - XML parsing
- **cheerio** - HTML parsing for content extraction
- **Jest** - Testing framework

## Testing

```sh
npm test              # Run all tests
npm run test:coverage # Run tests with coverage
```

## Format Support

### RSS 2.0

Standard RSS format with support for:

- Content encoding (`content:encoded`)
- Dublin Core metadata (`dc:creator`)
- Categories and enclosures

### Atom 1.0

Atom feed format with full support for:

- Multiple authors
- Rich content types
- Link relations
- Categories

### JSON Feed

Modern JSON-based feed format (v1.1) with support for:

- Attachments
- Multiple authors
- Tags
- Rich metadata

## License

MIT
