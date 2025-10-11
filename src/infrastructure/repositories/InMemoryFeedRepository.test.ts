import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Feed } from '../../domain/Feed.js';

// Mock pino before importing the repository
jest.unstable_mockModule('pino', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  const mockPino = Object.assign(() => mockLogger, {
    stdTimeFunctions: {
      isoTime: () => ',"time":"2024-01-01T00:00:00.000Z"',
    },
  });
  return { default: mockPino };
});

const { InMemoryFeedRepository } = await import('./InMemoryFeedRepository.js');

describe('InMemoryFeedRepository', () => {
  let repository: InstanceType<typeof InMemoryFeedRepository>;

  beforeEach(() => {
    repository = new InMemoryFeedRepository();
  });

  describe('save and findByUrl', () => {
    it('should save and retrieve a feed from cache', async () => {
      const url = 'https://example.com/feed.xml';
      const feed: Feed = {
        data: '<rss>test</rss>',
        contentType: 'application/rss+xml',
      };

      await repository.save(url, feed);
      const result = await repository.findByUrl(url);

      expect(result).toEqual(feed);
    });

    it('should return cached feed without fetching again', async () => {
      const url = 'https://example.com/cached-feed.xml';
      const feed: Feed = {
        data: '<rss>cached data</rss>',
        contentType: 'application/xml',
      };

      // Save to cache
      await repository.save(url, feed);

      // Retrieve from cache
      const result = await repository.findByUrl(url);

      expect(result).toEqual(feed);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const stats = repository.getStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('keys');
    });

    it('should track cache keys correctly', async () => {
      const url = 'https://example.com/feed.xml';
      const feed: Feed = {
        data: '<rss>test</rss>',
        contentType: 'application/rss+xml',
      };

      await repository.save(url, feed);
      const stats = repository.getStats();

      expect(stats.keys).toBe(1);
    });
  });
});
