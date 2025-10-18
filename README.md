# Multi-Purpose API Server

A powerful API server with RSS proxy capabilities and a mock API system for testing and integration. Built with Node.js, Express, and TypeScript following Clean Architecture principles.

## Features

### RSS Proxy

- **CORS Bypass**: Fetch RSS feeds without CORS restrictions
- **Feed Transformation & Filtering**: Filter by keywords, date ranges, and categories
- **Format Conversion**: Convert between RSS, Atom, and JSON Feed formats
- **Content Enhancement**: Extract full article content and add metadata
- **Feed Merging**: Combine multiple RSS feeds into one
- **Caching**: Built-in in-memory caching (5 minutes TTL)

### API Mock Server

- **Custom Mock Endpoints**: Create up to 50 mock API endpoints
- **Flexible Responses**: Support for JSON, XML, plain text, and HTML
- **Response Control**: Configure status codes (200, 404, 500, etc.)
- **Delay Simulation**: Add artificial delays (0-10000ms) to test timeout scenarios
- **Enable/Disable**: Toggle endpoints without deleting them
- **Grouping**: Organize endpoints with Group IDs
- **Web UI**: User-friendly interface for managing mock endpoints
- **Persistent Storage**: SQLite database for endpoint persistence

### Architecture

- **TypeScript**: Fully typed with strict mode enabled
- **Clean Architecture**: Clear separation of concerns with dependency injection
- **Testing**: Comprehensive test coverage with Jest

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

## Mock API

The Mock API feature allows you to create and manage custom API endpoints for testing and integration purposes.

### Management UI

Access the web-based management interface at:

```
http://localhost:8080/mock-manage.html
```

Features:

- Create, edit, and delete mock endpoints
- Configure response data, status codes, and delays
- Toggle endpoints on/off
- View real-time statistics
- Copy endpoint URLs to clipboard
- Group related endpoints

### API Endpoints

#### Management API

**List all endpoints**

```sh
GET /api-mock/endpoints
```

**Get endpoint by ID**

```sh
GET /api-mock/endpoints/:id
```

**Create new endpoint**

```sh
POST /api-mock/endpoints
Content-Type: application/json

{
  "name": "User List",
  "path": "/users",
  "responseData": {"users": [{"id": 1, "name": "John Doe"}]},
  "contentType": "application/json",
  "statusCode": 200,
  "delayMs": 0,
  "enabled": true,
  "groupId": "user-api"
}
```

**Update endpoint**

```sh
PATCH /api-mock/endpoints/:id
Content-Type: application/json

{
  "statusCode": 404,
  "enabled": false
}
```

**Delete endpoint**

```sh
DELETE /api-mock/endpoints/:id
```

**Get statistics**

```sh
GET /api-mock/stats
```

#### Mock Endpoint Access

Once created, mock endpoints are accessible at:

```
http://localhost:8080/api-mock/serve{path}
```

For example, if you created an endpoint with path `/users`, access it at:

```sh
GET http://localhost:8080/api-mock/serve/users
```

All HTTP methods (GET, POST, PUT, DELETE, PATCH, etc.) are supported.

### Example Workflow

1. **Create a mock endpoint** (via UI or API):
   - Name: "Get User"
   - Path: `/users/1`
   - Response: `{"id": 1, "name": "John Doe", "email": "john@example.com"}`
   - Status Code: 200
   - Delay: 500ms

2. **Use in your application**:

   ```javascript
   fetch('http://localhost:8080/api-mock/serve/users/1')
     .then((res) => res.json())
     .then((data) => console.log(data));
   ```

3. **Simulate error scenarios**:
   - Update status code to 404 or 500
   - Add delay to test timeout handling
   - Disable endpoint to test unavailability

### Use Cases

- **Integration Testing**: Mock external APIs during development
- **Load Testing**: Create endpoints to test application behavior
- **Demo/Prototype**: Quickly create fake APIs for demonstrations
- **Offline Development**: Work without depending on external services
- **Error Testing**: Simulate various error conditions

## Architecture

This project follows Clean Architecture principles with clear separation of concerns:

```
src/
├── domain/                   # Core business entities
│   ├── Feed.ts              # Feed interface
│   ├── FeedItem.ts          # Feed item structures
│   └── MockEndpoint.ts      # Mock endpoint interface
├── application/             # Business logic layer
│   ├── repositories/        # Repository interfaces
│   │   ├── FeedRepository.ts
│   │   └── MockEndpointRepository.ts
│   └── services/            # Business services
│       ├── RssService.ts
│       ├── FeedTransformService.ts
│       ├── FormatConversionService.ts
│       ├── ContentEnhancementService.ts
│       └── MockEndpointService.ts
├── infrastructure/          # External implementations
│   ├── repositories/
│   │   ├── InMemoryFeedRepository.ts
│   │   └── SqliteMockEndpointRepository.ts
│   └── utils/
│       └── FeedParser.ts
└── presentation/            # HTTP layer
    ├── controllers/
    │   ├── RssController.ts
    │   ├── FeedController.ts
    │   ├── MockManagementController.ts
    │   └── MockApiController.ts
    └── server.ts
```

## Configuration

### RSS Proxy

- **Port**: Set via `PORT` environment variable (default: `8080`)
- **Cache TTL**: 300 seconds (5 minutes)
- **Max cache entries**: 100

### Mock API

- **Max endpoints**: 50
- **Database**: SQLite at `data/mock-endpoints.db`
- **Delay range**: 0-10000ms
- **Supported content types**: application/json, application/xml, text/plain, text/html

## Technologies

- **Express** - Web framework
- **TypeScript** - Type-safe development
- **pino** - Structured logging
- **node-cache** - In-memory caching (RSS feeds)
- **better-sqlite3** - SQLite database (Mock endpoints)
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
