import { describe, expect, it } from '@jest/globals';
import { FormatConversionService } from '../FormatConversionService.js';
import type { ParsedFeed } from '../../../domain/FeedItem.js';

describe('FormatConversionService', () => {
  let service: FormatConversionService;

  beforeEach(() => {
    service = new FormatConversionService();
  });

  const mockFeed: ParsedFeed = {
    title: 'Test Feed',
    description: 'Test Description',
    link: 'https://example.com',
    language: 'en',
    feedType: 'rss',
    items: [
      {
        title: 'Test Post',
        link: 'https://example.com/post1',
        description: 'Test description',
        pubDate: '2024-01-15T10:00:00Z',
        author: 'John Doe',
        categories: ['tech', 'news'],
        guid: 'post-1',
        content: '<p>Full content here</p>',
        enclosure: {
          url: 'https://example.com/audio.mp3',
          type: 'audio/mpeg',
          length: '12345',
        },
      },
    ],
  };

  describe('toRSS', () => {
    it('should convert feed to RSS format', () => {
      const result = service.toRSS(mockFeed);

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<rss version="2.0"');
      expect(result).toContain('<title>Test Feed</title>');
      expect(result).toContain('<description>Test Description</description>');
      expect(result).toContain('<link>https://example.com</link>');
      expect(result).toContain('<language>en</language>');
      expect(result).toContain('<item>');
      expect(result).toContain('Test Post');
      expect(result).toContain('<dc:creator>John Doe</dc:creator>');
      expect(result).toContain('<category>tech</category>');
      expect(result).toContain('<enclosure');
    });

    it('should escape XML entities', () => {
      const feedWithSpecialChars: ParsedFeed = {
        ...mockFeed,
        title: 'Test & Feed <script>',
        items: [
          {
            ...mockFeed.items[0],
            title: 'Post with "quotes" & <tags>',
          },
        ],
      };

      const result = service.toRSS(feedWithSpecialChars);

      expect(result).toContain('&amp;');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&quot;');
    });
  });

  describe('toAtom', () => {
    it('should convert feed to Atom format', () => {
      const result = service.toAtom(mockFeed);

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
      expect(result).toContain('<title>Test Feed</title>');
      expect(result).toContain('<subtitle>Test Description</subtitle>');
      expect(result).toContain(
        '<link href="https://example.com" rel="alternate"/>'
      );
      expect(result).toContain('<entry>');
      expect(result).toContain('<author><name>John Doe</name></author>');
      expect(result).toContain('<category term="tech"/>');
      expect(result).toContain('<summary>Test description</summary>');
    });

    it('should include updated timestamp', () => {
      const result = service.toAtom(mockFeed);
      expect(result).toContain('<updated>2024-01-15T10:00:00Z</updated>');
    });
  });

  describe('toJSON', () => {
    it('should convert feed to JSON Feed format', () => {
      const result = service.toJSON(mockFeed);
      const parsed = JSON.parse(result);

      expect(parsed.version).toBe('https://jsonfeed.org/version/1.1');
      expect(parsed.title).toBe('Test Feed');
      expect(parsed.home_page_url).toBe('https://example.com');
      expect(parsed.description).toBe('Test Description');
      expect(parsed.language).toBe('en');
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].id).toBe('post-1');
      expect(parsed.items[0].title).toBe('Test Post');
      expect(parsed.items[0].url).toBe('https://example.com/post1');
      expect(parsed.items[0].authors).toHaveLength(1);
      expect(parsed.items[0].authors[0].name).toBe('John Doe');
      expect(parsed.items[0].tags).toEqual(['tech', 'news']);
    });

    it('should include attachments for enclosures', () => {
      const result = service.toJSON(mockFeed);
      const parsed = JSON.parse(result);

      expect(parsed.items[0].attachments).toBeDefined();
      expect(parsed.items[0].attachments).toHaveLength(1);
      expect(parsed.items[0].attachments[0].url).toBe(
        'https://example.com/audio.mp3'
      );
      expect(parsed.items[0].attachments[0].mime_type).toBe('audio/mpeg');
      expect(parsed.items[0].attachments[0].size_in_bytes).toBe(12345);
    });

    it('should produce valid JSON', () => {
      const result = service.toJSON(mockFeed);
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });
});
