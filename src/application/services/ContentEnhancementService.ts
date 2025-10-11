import * as cheerio from 'cheerio';
import type { ParsedFeed } from '../../domain/FeedItem.js';
import type { Logger } from 'pino';

export class ContentEnhancementService {
  constructor(private logger: Logger) {}

  async enhanceWithFullText(feed: ParsedFeed): Promise<ParsedFeed> {
    const enhancedItems = await Promise.all(
      feed.items.map(async (item) => {
        try {
          // Only fetch if content seems truncated (less than 200 chars)
          if (item.content && item.content.length > 200) {
            return item;
          }

          const fullContent = await this.extractFullContent(item.link);
          if (fullContent) {
            return {
              ...item,
              content: fullContent,
            };
          }
        } catch (error) {
          this.logger.warn(
            { url: item.link, error: (error as Error).message },
            'Failed to extract full content'
          );
        }
        return item;
      })
    );

    return {
      ...feed,
      items: enhancedItems,
    };
  }

  private async extractFullContent(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; RSS-Proxy/1.0; +https://github.com/yourusername/rss-proxy)',
        },
      });

      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove unwanted elements
      $(
        'script, style, nav, footer, header, aside, .advertisement, .ads'
      ).remove();

      // Try to find main content area
      let content = '';

      // Common content selectors (prioritized)
      const selectors = [
        'article',
        '[role="main"]',
        'main',
        '.post-content',
        '.entry-content',
        '.article-content',
        '.content',
        '#content',
      ];

      for (const selector of selectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          content = element.html() || '';
          if (content.length > 200) {
            break;
          }
        }
      }

      // Fallback to body if no content found
      if (!content || content.length < 200) {
        content = $('body').html() || '';
      }

      return content.trim();
    } catch (error) {
      this.logger.warn(
        { url, error: (error as Error).message },
        'Error fetching content'
      );
      return null;
    }
  }

  extractMetadata(feed: ParsedFeed): ParsedFeed {
    const itemsWithMetadata = feed.items.map((item) => {
      const readingTime = this.calculateReadingTime(
        item.content || item.description
      );

      return {
        ...item,
        description:
          item.description + (readingTime ? ` (${readingTime} min read)` : ''),
      };
    });

    return {
      ...feed,
      items: itemsWithMetadata,
    };
  }

  private calculateReadingTime(content: string): number {
    const text = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
    const words = text.split(/\s+/).length;
    const wordsPerMinute = 200;
    return Math.ceil(words / wordsPerMinute);
  }
}
