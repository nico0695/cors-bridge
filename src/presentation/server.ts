import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { RssController } from './controllers/RssController.js';
import { FeedController } from './controllers/FeedController.js';
import { RssService } from '../application/services/RssService.js';
import { InMemoryFeedRepository } from '../infrastructure/repositories/InMemoryFeedRepository.js';
import { MockManagementController } from './controllers/MockManagementController.js';
import { MockApiController } from './controllers/MockApiController.js';
import { MockEndpointService } from '../application/services/MockEndpointService.js';
import { SqliteMockEndpointRepository } from '../infrastructure/repositories/SqliteMockEndpointRepository.js';
import { UserService } from '../application/services/UserService.js';
import { SqliteUserRepository } from '../infrastructure/repositories/SqliteUserRepository.js';
import { AuthController } from './controllers/AuthController.js';
import { UserController } from './controllers/UserController.js';
import { createAuthMiddleware } from './middleware/authMiddleware.js';
import pino from 'pino';

const app = express();
const PORT = process.env.PORT || 8080;
const logger = pino({
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  messageKey: 'message',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

// Middleware
app.use(express.json());

// CORS middleware for all routes
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send();
    return;
  }

  next();
});

// Dependency Injection
const feedRepository = new InMemoryFeedRepository();
const rssService = new RssService(feedRepository);
const rssController = new RssController(rssService);
const feedController = new FeedController(feedRepository, logger);

// Mock API Dependency Injection
const mockEndpointRepository = new SqliteMockEndpointRepository(logger);
const mockEndpointService = new MockEndpointService(mockEndpointRepository);
const mockManagementController = new MockManagementController(
  mockEndpointService,
  logger
);
const mockApiController = new MockApiController(mockEndpointService, logger);

// User/Auth Dependency Injection
const userRepository = new SqliteUserRepository(logger);
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  logger.warn(
    'JWT_SECRET environment variable is not set; using fallback secret suitable for local development only'
  );
}
const userService = new UserService(userRepository, jwtSecret ?? 'change-me');
const authController = new AuthController(userService, logger);
const userController = new UserController(userService, logger);
const authMiddleware = createAuthMiddleware(userService, logger);

const ensureDefaultAdminUser = (): void => {
  const defaultName = process.env.DEFAULT_ADMIN_NAME ?? 'admin';
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin';
  const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL;

  if (!defaultName || !defaultPassword) {
    logger.info('Default admin credentials not fully configured; skipping');
    return;
  }

  try {
    const existing = userRepository.findByName(defaultName);
    if (!existing) {
      userService.createUser({
        name: defaultName,
        password: defaultPassword,
        email: defaultEmail,
        status: 'enabled',
      });
      logger.info(
        { name: defaultName },
        'Default admin user created from environment configuration'
      );
    } else {
      userService.updateUser(existing.id, {
        password: defaultPassword,
        status: 'enabled',
        ...(defaultEmail ? { email: defaultEmail } : {}),
      });
      logger.info(
        { name: defaultName },
        'Default admin user refreshed from environment configuration'
      );
    }
  } catch (error) {
    logger.error({ error }, 'Failed to ensure default admin user');
  }
};

ensureDefaultAdminUser();

// Resolve public directory relative to this module so the app works
// when run from `dist` (`node dist/presentation/server.js`) or from
// source (`tsx src/presentation/server.ts`).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let publicPath = path.join(__dirname, '..', '..', 'public');

// Fallback to process.cwd() if the computed path doesn't exist
if (!fs.existsSync(publicPath)) {
  const alt = path.join(process.cwd(), 'public');
  if (fs.existsSync(alt)) {
    publicPath = alt;
  } else {
    // If neither exists, log a clear error so startup debugging is easier
    console.warn(`public directory not found at ${publicPath} or ${alt}`);
  }
}

app.use(express.static(publicPath));

// Ensure GET / always returns the index.html from the public folder
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('/rss', (req, res) => rssController.getFeed(req, res));

// New endpoints for feed transformation and enhancement
app.get('/api/feed/transform', (req, res) =>
  feedController.getTransformedFeed(req, res)
);
app.get('/api/feed/merge', (req, res) =>
  feedController.getMergedFeeds(req, res)
);
app.get('/api/feed/enhance', (req, res) =>
  feedController.getEnhancedFeed(req, res)
);

// Authentication Routes
app.post('/api-auth/login', (req, res) => authController.login(req, res));
app.post('/api-auth/refresh', (req, res) => authController.refresh(req, res));

// Public registration route (users start as blocked)
app.post('/api-auth/register', (req, res) => userController.register(req, res));

// User Management Routes
app.get('/api-auth/users', authMiddleware.requireAuth, (req, res) =>
  userController.list(req, res)
);
app.post(
  '/api-auth/users',
  authMiddleware.attachAuthUserIfPresent,
  (req, res) => userController.create(req, res)
);
app.patch('/api-auth/users/:id', authMiddleware.requireAuth, (req, res) =>
  userController.update(req, res)
);
app.delete('/api-auth/users/:id', authMiddleware.requireAuth, (req, res) =>
  userController.delete(req, res)
);

// Mock API Management Routes
app.get('/api-mock/endpoints', (req, res) =>
  mockManagementController.getAll(req, res)
);
app.get('/api-mock/endpoints/:id', (req, res) =>
  mockManagementController.getById(req, res)
);
app.post('/api-mock/endpoints', (req, res) =>
  mockManagementController.create(req, res)
);
app.patch('/api-mock/endpoints/:id', (req, res) =>
  mockManagementController.update(req, res)
);
app.delete('/api-mock/endpoints/:id', (req, res) =>
  mockManagementController.delete(req, res)
);
app.get('/api-mock/stats', (req, res) =>
  mockManagementController.getStats(req, res)
);

// Mock API Serve Route (wildcard must be last)
app.all('/api-mock/serve/*', (req, res) => mockApiController.serve(req, res));

app.get('/health', (req, res) => {
  const stats = feedRepository.getStats();
  const healthCheck = {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cacheStats: stats,
  };
  res.send(healthCheck);
});

app.listen(PORT, () => {
  logger.info(`✅ RSS Proxy running on port ${PORT}`);
});
