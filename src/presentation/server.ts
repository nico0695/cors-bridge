import express from 'express';
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

app.get('/rss', (req, res) => rssController.getFeed(req, res));

app.get('/', (req, res) => {
  res.send('📰 RSS Proxy is running. Use /rss?url=https://example.com/feed');
});

app.listen(PORT, () => {
  logger.info(`✅ RSS Proxy running on port ${PORT}`);
});
