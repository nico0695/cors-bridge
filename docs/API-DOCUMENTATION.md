# API Documentation - Multi-Purpose API Server

This document provides comprehensive information about the API endpoints, data models, and implementation details for building a modern frontend (e.g., with Next.js, React, Vue, etc.).

## Table of Contents

- [API Overview](#api-overview)
- [Mock API Endpoints](#mock-api-endpoints)
- [Data Models & TypeScript Interfaces](#data-models--typescript-interfaces)
- [RSS Proxy API](#rss-proxy-api)
- [Current Manager Implementation](#current-manager-implementation)
- [Recommendations for Improvements](#recommendations-for-improvements)
- [Frontend Development Guide](#frontend-development-guide)

---

## API Overview

**Base URL:** `http://localhost:8080`

**Available Services:**

1. **Mock API** - Create and manage mock endpoints for testing (`/api-mock/*`)
2. **RSS Proxy** - Fetch and transform RSS feeds (`/rss`, `/api/feed/*`)
3. **Health Check** - Server health and statistics (`/health`)

**Response Format:** All responses are JSON (except for RSS feeds which can be RSS/Atom/JSON)

**CORS:** Enabled for all endpoints with `Access-Control-Allow-Origin: *`

---

## Mock API Endpoints

### Base Path: `/api-mock`

### 1. **Get All Mock Endpoints**

**Endpoint:** `GET /api-mock/endpoints`

**Description:** Retrieve a list of all configured mock endpoints.

**Request:**

```http
GET /api-mock/endpoints
```

**Response:** `200 OK`

```typescript
MockEndpoint[]
```

**Example Response:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Get User",
    "path": "/users/1",
    "groupId": "users-api",
    "responseData": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    },
    "contentType": "application/json",
    "statusCode": 200,
    "enabled": true,
    "delayMs": 0,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
]
```

**Use Cases:**

- Display list of all mock endpoints in a dashboard
- Filter/search endpoints by name, path, or group
- Show statistics (total, enabled, disabled)

---

### 2. **Get Mock Endpoint by ID**

**Endpoint:** `GET /api-mock/endpoints/:id`

**Description:** Retrieve details of a specific mock endpoint.

**Request:**

```http
GET /api-mock/endpoints/550e8400-e29b-41d4-a716-446655440000
```

**Response:** `200 OK`

```typescript
MockEndpoint;
```

**Error Response:** `404 Not Found`

```json
{
  "error": "Endpoint not found"
}
```

**Use Cases:**

- View detailed information about a specific endpoint
- Pre-fill edit form with existing data
- Deep linking to specific endpoint details

---

### 3. **Create Mock Endpoint**

**Endpoint:** `POST /api-mock/endpoints`

**Description:** Create a new mock endpoint.

**Request:**

```http
POST /api-mock/endpoints
Content-Type: application/json

{
  "name": "Get User",
  "path": "/users/1",
  "groupId": "users-api",
  "responseData": {
    "id": 1,
    "name": "John Doe"
  },
  "contentType": "application/json",
  "statusCode": 200,
  "enabled": true,
  "delayMs": 500
}
```

**Request Body Type:**

```typescript
CreateMockEndpointDto;
```

**Response:** `201 Created`

```typescript
MockEndpoint;
```

**Error Responses:**

- `400 Bad Request` - Validation error or duplicate path

```json
{
  "error": "Endpoint with path /users/1 already exists"
}
```

```json
{
  "error": "Cannot create endpoint: maximum limit of 50 endpoints reached"
}
```

**Validation Rules:**

- `name`: Required, string
- `path`: Required, string (will be normalized with leading `/`)
- `responseData`: Required, any valid JSON or string
- `contentType`: Optional, defaults to `"application/json"`
- `statusCode`: Optional, defaults to `200`
- `enabled`: Optional, defaults to `true`
- `delayMs`: Optional, defaults to `0` (max: 10000)
- `groupId`: Optional, string

**Use Cases:**

- Create new mock endpoint from UI form
- Bulk import endpoints from JSON file
- Quick endpoint creation via CLI/script

---

### 4. **Update Mock Endpoint**

**Endpoint:** `PATCH /api-mock/endpoints/:id`

**Description:** Partially update an existing mock endpoint.

**Request:**

```http
PATCH /api-mock/endpoints/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "statusCode": 404,
  "enabled": false,
  "responseData": {
    "error": "User not found"
  }
}
```

**Request Body Type:**

```typescript
UpdateMockEndpointDto;
```

**Response:** `200 OK`

```typescript
MockEndpoint;
```

**Error Responses:**

- `404 Not Found` - Endpoint doesn't exist
- `400 Bad Request` - Validation error (e.g., duplicate path)

**Use Cases:**

- Toggle endpoint enabled/disabled
- Update response data for different test scenarios
- Change status code to simulate errors
- Adjust delay for timeout testing

---

### 5. **Delete Mock Endpoint**

**Endpoint:** `DELETE /api-mock/endpoints/:id`

**Description:** Delete a mock endpoint.

**Request:**

```http
DELETE /api-mock/endpoints/550e8400-e29b-41d4-a716-446655440000
```

**Response:** `204 No Content`

**Error Response:** `404 Not Found`

```json
{
  "error": "Endpoint not found"
}
```

**Use Cases:**

- Remove unused endpoints
- Clean up test data
- Endpoint management

---

### 6. **Get Statistics**

**Endpoint:** `GET /api-mock/stats`

**Description:** Get statistics about mock endpoints.

**Request:**

```http
GET /api-mock/stats
```

**Response:** `200 OK`

```json
{
  "total": 15,
  "enabled": 12,
  "disabled": 3,
  "maxEndpoints": 50,
  "remaining": 35
}
```

**Response Type:**

```typescript
{
  total: number;
  enabled: number;
  disabled: number;
  maxEndpoints: number;
  remaining: number;
}
```

**Use Cases:**

- Display dashboard statistics
- Show warnings when approaching limit
- Analytics and monitoring

---

### 7. **Serve Mock Endpoint**

**Endpoint:** `ANY /api-mock/serve/*`

**Description:** Access a configured mock endpoint. Supports all HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS, etc.).

**Request:**

```http
GET /api-mock/serve/users/1
```

**Response:** Configured response with configured status code and delay

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Headers:**

```
Content-Type: application/json (or configured contentType)
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

**Error Responses:**

- `404 Not Found` - Mock endpoint not found for this path

```json
{
  "error": "Mock endpoint not found"
}
```

- `503 Service Unavailable` - Endpoint is disabled

```json
{
  "error": "Mock endpoint is disabled"
}
```

**Behavior:**

- If `delayMs > 0`: Response is delayed by specified milliseconds
- Returns configured `statusCode`, `responseData`, and `contentType`
- Works with any HTTP method

**Use Cases:**

- Integration testing with your application
- Frontend development without backend
- API prototyping and demos
- Load testing with predictable responses

---

## Data Models & TypeScript Interfaces

### MockEndpoint

Complete endpoint entity returned by the API.

```typescript
interface MockEndpoint {
  id: string; // UUID
  name: string; // Display name
  path: string; // Relative path (e.g., "/users/1")
  groupId?: string; // Optional group identifier
  responseData: unknown; // JSON object or string
  contentType: string; // MIME type
  statusCode: number; // HTTP status code
  enabled: boolean; // Whether endpoint is active
  delayMs: number; // Response delay in milliseconds
  createdAt: Date; // ISO 8601 timestamp
  updatedAt: Date; // ISO 8601 timestamp
}
```

### CreateMockEndpointDto

Payload for creating a new endpoint.

```typescript
interface CreateMockEndpointDto {
  name: string; // Required
  path: string; // Required
  groupId?: string; // Optional
  responseData: unknown; // Required
  contentType?: string; // Optional, default: "application/json"
  statusCode?: number; // Optional, default: 200
  enabled?: boolean; // Optional, default: true
  delayMs?: number; // Optional, default: 0
}
```

### UpdateMockEndpointDto

Payload for updating an endpoint (all fields optional).

```typescript
interface UpdateMockEndpointDto {
  name?: string;
  path?: string;
  groupId?: string;
  responseData?: unknown;
  contentType?: string;
  statusCode?: number;
  enabled?: boolean;
  delayMs?: number;
}
```

### ContentType Options

```typescript
type ContentType =
  | 'application/json'
  | 'application/xml'
  | 'text/plain'
  | 'text/html';
```

### Common Status Codes

```typescript
const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
```

---

## RSS Proxy API

### 1. **Basic RSS Proxy**

**Endpoint:** `GET /rss`

**Description:** Fetch an RSS feed with CORS headers.

**Query Parameters:**

- `url` (required): RSS feed URL

**Request:**

```http
GET /rss?url=https://feeds.bbci.co.uk/news/rss.xml
```

**Response:** XML feed with CORS headers

---

### 2. **Transform Feed**

**Endpoint:** `GET /api/feed/transform`

**Query Parameters:**

- `url` (required): RSS feed URL
- `keywords`: Filter by keywords (comma-separated)
- `exclude`: Exclude keywords (comma-separated)
- `fromDate`: Filter from date (ISO 8601)
- `toDate`: Filter to date (ISO 8601)
- `categories`: Filter by categories (comma-separated)
- `limit`: Limit number of items
- `sortBy`: Sort by `date` or `title`
- `order`: `asc` or `desc`
- `format`: Output format (`rss`, `atom`, `json`)

---

### 3. **Merge Feeds**

**Endpoint:** `GET /api/feed/merge`

**Query Parameters:**

- `urls` (required): Comma-separated feed URLs
- `limit`: Limit items
- `format`: Output format

---

### 4. **Enhance Feed**

**Endpoint:** `GET /api/feed/enhance`

**Query Parameters:**

- `url` (required): RSS feed URL
- `format`: Output format

---

## Current Manager Implementation

### File: `public/mock-manage.html`

**Technology Stack:**

- Vanilla HTML/CSS/JavaScript
- No framework dependencies
- Fetch API for HTTP requests
- Pure JavaScript for UI updates

**Architecture:**

```
├── HTML Structure
│   ├── Header (stats display)
│   ├── Actions (create button)
│   ├── Endpoints List (dynamic)
│   └── Modal (create/edit form)
│
├── CSS Styling
│   ├── Responsive layout
│   ├── Toggle switches
│   ├── Badge system
│   └── Modal overlay
│
└── JavaScript Logic
    ├── State Management (endpoints array)
    ├── API Communication (fetch)
    ├── UI Rendering (innerHTML)
    └── Event Handlers
```

### Key Features

**1. Endpoints List**

- Displays all endpoints with key info (name, path, status code, delay)
- Toggle switch for enable/disable
- Collapsible details section
- Edit and delete buttons

**2. Create/Edit Modal**

- Single form for both create and edit operations
- Real-time validation
- Error display
- JSON parsing for responseData

**3. Statistics Header**

- Total endpoints
- Enabled/disabled count
- Remaining slots (with warning at ≤5)

**4. Actions**

- Toggle endpoint (PATCH request with `enabled` field)
- Edit endpoint (opens modal with pre-filled data)
- Delete endpoint (with confirmation)
- Copy endpoint URL to clipboard

### Data Flow

```
User Action → Event Handler → API Request → Update State → Re-render UI
```

**Example: Toggle Endpoint**

```javascript
toggleEndpoint(id, enabled)
  → PATCH /api-mock/endpoints/:id {enabled}
  → loadEndpoints()
  → renderEndpoints() + updateStats()
```

**Example: Create Endpoint**

```javascript
Form Submit
  → Validate JSON
  → POST /api-mock/endpoints {data}
  → closeModal()
  → loadEndpoints()
  → renderEndpoints() + updateStats()
```

### UI Components

**1. Endpoint Card**

```html
<div class="endpoint-item">
  <div class="endpoint-header">
    <div class="endpoint-title">
      <span class="endpoint-name">...</span>
      <span class="endpoint-path">...</span>
      <span class="badge">...</span>
    </div>
    <div class="endpoint-controls">
      <label class="toggle">...</label>
      <button>Details</button>
      <button>Edit</button>
      <button>Delete</button>
    </div>
  </div>
  <div class="endpoint-details">...</div>
</div>
```

**2. Modal Form**

- Hidden by default (`display: none`)
- Opens with `.open` class (`display: flex`)
- Closes on backdrop click or cancel button
- Shared for create and edit (determined by `endpoint-id` hidden field)

---

## Recommendations for Improvements

### UI/UX Enhancements

1. **Search and Filtering**
   - Search by name, path, or group
   - Filter by status (enabled/disabled)
   - Filter by status code range
   - Filter by group

2. **Bulk Operations**
   - Select multiple endpoints (checkboxes)
   - Bulk enable/disable
   - Bulk delete with confirmation
   - Bulk export to JSON

3. **Import/Export**
   - Export all endpoints as JSON
   - Export selected endpoints
   - Import endpoints from JSON file
   - Import from OpenAPI/Swagger spec

4. **Grouping & Organization**
   - Group view (accordion by groupId)
   - Drag-and-drop reordering
   - Color coding by group
   - Group management (create, edit, delete groups)

5. **Enhanced Editing**
   - Code editor with syntax highlighting (Monaco, CodeMirror)
   - JSON schema validation
   - Response preview/test button
   - Template library (common responses)

6. **Testing Tools**
   - Test endpoint directly from UI
   - Request history
   - Response time monitoring
   - cURL command generator

7. **Analytics & Monitoring**
   - Usage statistics per endpoint
   - Request logs
   - Response time charts
   - Error rate tracking

### Technical Improvements

1. **State Management**
   - Use React Context or Redux for global state
   - Optimistic UI updates
   - Undo/redo functionality
   - Local storage persistence

2. **Real-time Updates**
   - WebSocket connection for live updates
   - Server-sent events for logs
   - Auto-refresh option

3. **Validation**
   - Form validation with Zod/Yup
   - Path uniqueness check before submit
   - Response data validation
   - Custom validation rules

4. **Error Handling**
   - Toast notifications
   - Retry mechanism
   - Offline detection
   - Better error messages

5. **Performance**
   - Virtual scrolling for large lists
   - Pagination
   - Lazy loading
   - Memoization

6. **Accessibility**
   - Keyboard navigation
   - Screen reader support
   - ARIA labels
   - Focus management

### Feature Additions

1. **Request Matching**
   - Match by headers
   - Match by query parameters
   - Match by request body
   - Conditional responses

2. **Response Templating**
   - Dynamic data (timestamps, UUIDs)
   - Faker.js integration
   - Template variables
   - Response sequences

3. **Authentication**
   - Basic auth for management UI
   - API key requirement
   - Role-based access

4. **Versioning**
   - Endpoint version history
   - Rollback capability
   - Compare versions

5. **Documentation**
   - Auto-generate API docs
   - Export to Markdown
   - Share endpoint documentation

6. **Scenarios**
   - Save endpoint configurations as scenarios
   - Switch between scenarios
   - A/B testing support

---

## Frontend Development Guide

### Recommended Tech Stack for Next.js

**Core:**

- Next.js 14+ (App Router)
- TypeScript
- React 18+

**UI Libraries:**

- **shadcn/ui** - Beautiful, accessible components
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Headless components
- **Lucide Icons** - Icon library

**State Management:**

- **Zustand** - Lightweight state management
- **TanStack Query (React Query)** - Server state management
- **Jotai** - Atomic state management (alternative)

**Form Handling:**

- **React Hook Form** - Performant forms
- **Zod** - Schema validation

**Data Fetching:**

- **TanStack Query** - Caching, polling, mutations
- **SWR** - Alternative for data fetching

**Code Editor:**

- **Monaco Editor** - VS Code editor in browser
- **@uiw/react-codemirror** - Lightweight alternative

**Additional Libraries:**

- **date-fns** or **Day.js** - Date manipulation
- **react-hot-toast** - Notifications
- **framer-motion** - Animations
- **recharts** - Charts for analytics

### Project Structure

```
app/
├── (dashboard)/
│   ├── layout.tsx              # Dashboard layout
│   ├── page.tsx                # Overview/home
│   ├── endpoints/
│   │   ├── page.tsx            # Endpoints list
│   │   ├── [id]/
│   │   │   ├── page.tsx        # Endpoint details
│   │   │   └── edit/
│   │   │       └── page.tsx    # Edit endpoint
│   │   └── new/
│   │       └── page.tsx        # Create endpoint
│   ├── groups/
│   │   └── page.tsx            # Group management
│   └── settings/
│       └── page.tsx            # Settings
│
├── api/                        # API routes (if needed for proxy)
│
components/
├── ui/                         # shadcn/ui components
├── endpoints/
│   ├── endpoint-card.tsx
│   ├── endpoint-form.tsx
│   ├── endpoint-list.tsx
│   └── endpoint-filters.tsx
├── shared/
│   ├── header.tsx
│   ├── sidebar.tsx
│   └── stats-card.tsx
│
lib/
├── api.ts                      # API client functions
├── types.ts                    # TypeScript types
├── utils.ts                    # Utility functions
└── validations.ts              # Zod schemas

stores/
├── endpoints-store.ts          # Zustand store
└── ui-store.ts                 # UI state

hooks/
├── use-endpoints.ts            # TanStack Query hooks
├── use-stats.ts
└── use-toast.ts
```

### API Client Example

```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const api = {
  // Endpoints
  getEndpoints: async (): Promise<MockEndpoint[]> => {
    const res = await fetch(`${API_BASE}/api-mock/endpoints`);
    if (!res.ok) throw new Error('Failed to fetch endpoints');
    return res.json();
  },

  getEndpoint: async (id: string): Promise<MockEndpoint> => {
    const res = await fetch(`${API_BASE}/api-mock/endpoints/${id}`);
    if (!res.ok) throw new Error('Failed to fetch endpoint');
    return res.json();
  },

  createEndpoint: async (
    data: CreateMockEndpointDto
  ): Promise<MockEndpoint> => {
    const res = await fetch(`${API_BASE}/api-mock/endpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create endpoint');
    }
    return res.json();
  },

  updateEndpoint: async (
    id: string,
    data: UpdateMockEndpointDto
  ): Promise<MockEndpoint> => {
    const res = await fetch(`${API_BASE}/api-mock/endpoints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update endpoint');
    }
    return res.json();
  },

  deleteEndpoint: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/api-mock/endpoints/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete endpoint');
  },

  getStats: async () => {
    const res = await fetch(`${API_BASE}/api-mock/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },
};
```

### TanStack Query Hooks Example

```typescript
// hooks/use-endpoints.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useEndpoints = () => {
  return useQuery({
    queryKey: ['endpoints'],
    queryFn: api.getEndpoints,
    staleTime: 30000, // 30 seconds
  });
};

export const useCreateEndpoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};

export const useUpdateEndpoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMockEndpointDto }) =>
      api.updateEndpoint(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
      queryClient.invalidateQueries({ queryKey: ['endpoint', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};
```

### Form Validation Example

```typescript
// lib/validations.ts
import { z } from 'zod';

export const createEndpointSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  path: z
    .string()
    .min(1, 'Path is required')
    .regex(/^\/.*/, 'Path must start with /'),
  groupId: z.string().optional(),
  responseData: z.string().min(1, 'Response data is required'),
  contentType: z.enum([
    'application/json',
    'application/xml',
    'text/plain',
    'text/html',
  ]),
  statusCode: z.number().int().min(100).max(599),
  enabled: z.boolean(),
  delayMs: z.number().int().min(0).max(10000),
});

export type CreateEndpointFormData = z.infer<typeof createEndpointSchema>;
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Key Considerations

1. **Error Boundaries:** Wrap routes with error boundaries
2. **Loading States:** Show skeletons/spinners during data fetch
3. **Optimistic Updates:** Update UI before server response
4. **Accessibility:** Use semantic HTML and ARIA labels
5. **Responsive Design:** Mobile-first approach
6. **Dark Mode:** Support theme switching
7. **Testing:** Unit tests with Vitest, E2E with Playwright
8. **Type Safety:** Share types between frontend and backend

---

## API Testing Examples

### Using cURL

```bash
# Create endpoint
curl -X POST http://localhost:8080/api-mock/endpoints \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","path":"/test","responseData":{"msg":"hi"}}'

# Get all endpoints
curl http://localhost:8080/api-mock/endpoints

# Update endpoint
curl -X PATCH http://localhost:8080/api-mock/endpoints/UUID \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}'

# Delete endpoint
curl -X DELETE http://localhost:8080/api-mock/endpoints/UUID

# Access mock endpoint
curl http://localhost:8080/api-mock/serve/test
```

### Using JavaScript/Fetch

```javascript
// Create
const response = await fetch('http://localhost:8080/api-mock/endpoints', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test Endpoint',
    path: '/test',
    responseData: { message: 'Hello' },
  }),
});
const endpoint = await response.json();

// List
const endpoints = await fetch('http://localhost:8080/api-mock/endpoints').then(
  (r) => r.json()
);

// Update
await fetch(`http://localhost:8080/api-mock/endpoints/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ enabled: false }),
});

// Delete
await fetch(`http://localhost:8080/api-mock/endpoints/${id}`, {
  method: 'DELETE',
});
```

---

## Conclusion

This API provides a complete mock server solution with full CRUD operations, flexible response configuration, and powerful testing capabilities. The current vanilla JS implementation can be enhanced with modern frameworks like Next.js for better developer experience, type safety, and advanced features.

**Next Steps:**

1. Review this documentation
2. Set up Next.js project with recommended tech stack
3. Implement API client and hooks
4. Build UI components with shadcn/ui
5. Add advanced features (search, filtering, bulk operations)
6. Deploy and iterate based on user feedback
