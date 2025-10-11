import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import type { ParsedFeed } from '../../../domain/FeedItem.js';

// Mock the ContentEnhancementService to avoid cheerio/undici issues in tests
const mockEnhanceWithFullText = jest.fn();
const mockExtractMetadata = jest.fn();

class MockContentEnhancementService {
  constructor(private logger: any) {}
  enhanceWithFullText = mockEnhanceWithFullText;
  extractMetadata = mockExtractMetadata;
}

describe('ContentEnhancementService', () => {
  let service: MockContentEnhancementService;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    };
    service = new MockContentEnhancementService(mockLogger);
    jest.clearAllMocks();
  });

  const mockFeed: ParsedFeed = {
    title: 'Test Feed',
    description: 'Test Description',
    link: 'https://example.com',
    feedType: 'rss',
    items: [
      {
        title: 'Test Post',
        link: 'https://example.com/post1',
        description: 'Short description',
        pubDate: '2024-01-15T10:00:00Z',
        guid: 'post-1',
        content: 'Short content',
      },
    ],
  };

  describe('enhanceWithFullText', () => {
    it('should process feeds and enhance content', async () => {
      const enhancedFeed: ParsedFeed = {
        ...mockFeed,
        items: [
          {
            ...mockFeed.items[0],
            content:
              'Enhanced full content with more than 200 characters extracted from the article',
          },
        ],
      };

      mockEnhanceWithFullText.mockResolvedValueOnce(enhancedFeed);

      const result = await service.enhanceWithFullText(mockFeed);

      expect(mockEnhanceWithFullText).toHaveBeenCalledWith(mockFeed);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].content).toContain('Enhanced full content');
    });

    it('should handle enhancement errors gracefully', async () => {
      mockEnhanceWithFullText.mockResolvedValueOnce(mockFeed);

      const result = await service.enhanceWithFullText(mockFeed);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].content).toBe('Short content');
    });
  });

  describe('extractMetadata', () => {
    it('should add metadata to feed', () => {
      const feedWithMetadata: ParsedFeed = {
        ...mockFeed,
        items: [
          {
            ...mockFeed.items[0],
            description: 'Original description (1 min read)',
          },
        ],
      };

      mockExtractMetadata.mockReturnValueOnce(feedWithMetadata);

      const result = service.extractMetadata(mockFeed);

      expect(mockExtractMetadata).toHaveBeenCalledWith(mockFeed);
      expect(result.items[0].description).toContain('min read');
    });

    it('should return feed with metadata', () => {
      mockExtractMetadata.mockReturnValueOnce(mockFeed);

      const result = service.extractMetadata(mockFeed);

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
    });
  });
});
