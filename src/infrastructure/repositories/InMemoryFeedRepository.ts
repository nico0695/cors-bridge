import { FeedRepository } from '../../application/repositories/FeedRepository.js';
import { Feed } from '../../domain/Feed.js';
import NodeCache from 'node-cache';
import fetch from 'node-fetch';
import pino from 'pino';

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

export class InMemoryFeedRepository implements FeedRepository {
  private readonly cache = new NodeCache({ stdTTL: 300, maxKeys: 100 });

  async findByUrl(url: string): Promise<Feed | null> {
    const cachedFeed = this.cache.get<Feed>(url);
    if (cachedFeed) {
      logger.info({ url, cache: 'hit' }, 'Serving from cache');
      return cachedFeed;
    }

    logger.info({ url, cache: 'miss' }, 'Fetching from origin');
    try {
      const response = await fetch(url);
      if (!response.ok) {
        logger.error(
          { url, status: response.status },
          'Failed to fetch remote content'
        );
        return null;
      }

      const contentType = response.headers.get('content-type') || 'text/plain';
      const data = await response.text();
      const feed: Feed = { data, contentType };

      this.cache.set(url, feed);

      return feed;
    } catch (err: unknown) {
      logger.error({ url, err }, 'Internal error fetching RSS');
      return null;
    }
  }

  async save(url: string, feed: Feed): Promise<void> {
    this.cache.set(url, feed);
  }

  getStats() {
    return this.cache.getStats();
  }
}
