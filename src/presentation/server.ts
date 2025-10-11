import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { RssController } from './controllers/RssController.js';
import { RssService } from '../application/services/RssService.js';
import { InMemoryFeedRepository } from '../infrastructure/repositories/InMemoryFeedRepository.js';
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

// Dependency Injection
const feedRepository = new InMemoryFeedRepository();
const rssService = new RssService(feedRepository);
const rssController = new RssController(rssService);

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
