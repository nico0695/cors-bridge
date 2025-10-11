import { describe, expect, it } from '@jest/globals';
import { FeedTransformService } from '../FeedTransformService.js';
import type { ParsedFeed } from '../../../domain/FeedItem.js';

describe('FeedTransformService', () => {
  let service: FeedTransformService;

  beforeEach(() => {
    service = new FeedTransformService();
  });

  const mockFeed: ParsedFeed = {
    title: 'Test Feed',
    description: 'Test Description',
    link: 'https://example.com',
    feedType: 'rss',
    items: [
      {
        title: 'First Post about TypeScript',
        link: 'https://example.com/1',
        description: 'Learn TypeScript basics',
        pubDate: '2024-01-15T10:00:00Z',
        categories: ['programming', 'typescript'],
        guid: '1',
      },
      {
        title: 'Second Post about JavaScript',
        link: 'https://example.com/2',
        description: 'JavaScript advanced topics',
        pubDate: '2024-01-20T10:00:00Z',
        categories: ['programming', 'javascript'],
        guid: '2',
      },
      {
        title: 'Third Post about Python',
        link: 'https://example.com/3',
        description: 'Python for beginners',
        pubDate: '2024-01-25T10:00:00Z',
        categories: ['programming', 'python'],
        guid: '3',
      },
    ],
  };

  describe('filter', () => {
    it('should filter by keywords', () => {
      const result = service.filter(mockFeed, { keywords: ['TypeScript'] });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toContain('TypeScript');
    });

    it('should exclude by keywords', () => {
      const result = service.filter(mockFeed, { excludeKeywords: ['Python'] });
      expect(result.items).toHaveLength(2);
      expect(result.items.every((item) => !item.title.includes('Python'))).toBe(
        true
      );
    });

    it('should filter by date range', () => {
      const result = service.filter(mockFeed, {
        fromDate: '2024-01-20T00:00:00Z',
      });
      expect(result.items).toHaveLength(2);
      expect(result.items[0].title).toContain('JavaScript');
    });

    it('should filter by categories', () => {
      const result = service.filter(mockFeed, { categories: ['typescript'] });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].categories).toContain('typescript');
    });

    it('should limit results', () => {
      const result = service.filter(mockFeed, { limit: 2 });
      expect(result.items).toHaveLength(2);
    });

    it('should combine multiple filters', () => {
      const result = service.filter(mockFeed, {
        keywords: ['Post'],
        excludeKeywords: ['Python'],
        limit: 1,
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).not.toContain('Python');
    });
  });

  describe('sort', () => {
    it('should sort by date descending', () => {
      const result = service.sort(mockFeed, { by: 'date', order: 'desc' });
      expect(result.items[0].title).toContain('Python');
      expect(result.items[2].title).toContain('TypeScript');
    });

    it('should sort by date ascending', () => {
      const result = service.sort(mockFeed, { by: 'date', order: 'asc' });
      expect(result.items[0].title).toContain('TypeScript');
      expect(result.items[2].title).toContain('Python');
    });

    it('should sort by title ascending', () => {
      const result = service.sort(mockFeed, { by: 'title', order: 'asc' });
      expect(result.items[0].title).toContain('First');
      expect(result.items[2].title).toContain('Third');
    });
  });

  describe('merge', () => {
    it('should merge multiple feeds', () => {
      const feed1: ParsedFeed = {
        title: 'Feed 1',
        description: 'First feed',
        link: 'https://example.com/1',
        feedType: 'rss',
        items: [
          {
            title: 'Post 1',
            link: 'https://example.com/1/post1',
            description: 'First post',
            pubDate: '2024-01-10T10:00:00Z',
            guid: 'p1',
          },
        ],
      };

      const feed2: ParsedFeed = {
        title: 'Feed 2',
        description: 'Second feed',
        link: 'https://example.com/2',
        feedType: 'rss',
        items: [
          {
            title: 'Post 2',
            link: 'https://example.com/2/post2',
            description: 'Second post',
            pubDate: '2024-01-20T10:00:00Z',
            guid: 'p2',
          },
        ],
      };

      const result = service.merge([feed1, feed2]);
      expect(result.items).toHaveLength(2);
      expect(result.title).toBe('Merged Feed');
      expect(result.items[0].title).toBe('Post 2'); // Sorted by date descending
    });

    it('should throw error when no feeds provided', () => {
      expect(() => service.merge([])).toThrow('No feeds to merge');
    });
  });
});
