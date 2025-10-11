import type { ParsedFeed } from '../../domain/FeedItem.js';

export interface FilterOptions {
  keywords?: string[];
  excludeKeywords?: string[];
  fromDate?: string;
  toDate?: string;
  categories?: string[];
  limit?: number;
}

export interface SortOptions {
  by?: 'date' | 'title';
  order?: 'asc' | 'desc';
}

export class FeedTransformService {
  filter(feed: ParsedFeed, options: FilterOptions): ParsedFeed {
    let items = [...feed.items];

    // Filter by keywords (search in title and description)
    if (options.keywords && options.keywords.length > 0) {
      items = items.filter((item) => {
        const searchText = `${item.title} ${item.description}`.toLowerCase();
        return options.keywords!.some((keyword) =>
          searchText.includes(keyword.toLowerCase())
        );
      });
    }

    // Exclude by keywords
    if (options.excludeKeywords && options.excludeKeywords.length > 0) {
      items = items.filter((item) => {
        const searchText = `${item.title} ${item.description}`.toLowerCase();
        return !options.excludeKeywords!.some((keyword) =>
          searchText.includes(keyword.toLowerCase())
        );
      });
    }

    // Filter by date range
    if (options.fromDate) {
      const fromDate = new Date(options.fromDate);
      items = items.filter((item) => {
        if (!item.pubDate) return false;
        return new Date(item.pubDate) >= fromDate;
      });
    }

    if (options.toDate) {
      const toDate = new Date(options.toDate);
      items = items.filter((item) => {
        if (!item.pubDate) return false;
        return new Date(item.pubDate) <= toDate;
      });
    }

    // Filter by categories
    if (options.categories && options.categories.length > 0) {
      items = items.filter((item) => {
        if (!item.categories || item.categories.length === 0) return false;
        return options.categories!.some((cat) =>
          item.categories!.some((itemCat) =>
            itemCat.toLowerCase().includes(cat.toLowerCase())
          )
        );
      });
    }

    // Limit results
    if (options.limit && options.limit > 0) {
      items = items.slice(0, options.limit);
    }

    return {
      ...feed,
      items,
    };
  }

  sort(feed: ParsedFeed, options: SortOptions): ParsedFeed {
    const items = [...feed.items];
    const order = options.order === 'asc' ? 1 : -1;

    if (options.by === 'date') {
      items.sort((a, b) => {
        const dateA = new Date(a.pubDate || 0).getTime();
        const dateB = new Date(b.pubDate || 0).getTime();
        return (dateA - dateB) * order;
      });
    } else if (options.by === 'title') {
      items.sort((a, b) => {
        return a.title.localeCompare(b.title) * order;
      });
    }

    return {
      ...feed,
      items,
    };
  }

  merge(feeds: ParsedFeed[]): ParsedFeed {
    if (feeds.length === 0) {
      throw new Error('No feeds to merge');
    }

    const allItems = feeds.flatMap((feed) => feed.items);

    // Sort by date descending
    allItems.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime();
      const dateB = new Date(b.pubDate || 0).getTime();
      return dateB - dateA;
    });

    return {
      title: 'Merged Feed',
      description: `Merged feed from ${feeds.length} sources`,
      link: '',
      feedType: 'rss',
      items: allItems,
    };
  }
}
