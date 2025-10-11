import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RssService } from './RssService.js';
import { FeedRepository } from '../repositories/FeedRepository.js';
import { Feed } from '../../domain/Feed.js';

describe('RssService', () => {
  let mockRepository: jest.Mocked<FeedRepository>;
  let rssService: RssService;

  beforeEach(() => {
    mockRepository = {
      findByUrl: jest.fn<FeedRepository['findByUrl']>(),
      save: jest.fn<FeedRepository['save']>(),
    } as jest.Mocked<FeedRepository>;

    rssService = new RssService(mockRepository);
  });

  describe('getFeed', () => {
    it('should return feed from repository', async () => {
      const mockFeed: Feed = {
        data: '<rss>test</rss>',
        contentType: 'application/rss+xml',
      };
      const url = 'https://example.com/feed.xml';

      mockRepository.findByUrl.mockResolvedValue(mockFeed);

      const result = await rssService.getFeed(url);

      expect(result).toEqual(mockFeed);
      expect(mockRepository.findByUrl).toHaveBeenCalledWith(url);
      expect(mockRepository.findByUrl).toHaveBeenCalledTimes(1);
    });

    it('should return null when feed is not found', async () => {
      const url = 'https://example.com/not-found.xml';

      mockRepository.findByUrl.mockResolvedValue(null);

      const result = await rssService.getFeed(url);

      expect(result).toBeNull();
      expect(mockRepository.findByUrl).toHaveBeenCalledWith(url);
    });

    it('should propagate repository errors', async () => {
      const url = 'https://example.com/error.xml';
      const error = new Error('Repository error');

      mockRepository.findByUrl.mockRejectedValue(error);

      await expect(rssService.getFeed(url)).rejects.toThrow('Repository error');
    });
  });
});
