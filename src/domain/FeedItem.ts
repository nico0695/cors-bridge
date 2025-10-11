export interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author?: string;
  categories?: string[];
  guid?: string;
  content?: string;
  enclosure?: {
    url: string;
    type: string;
    length?: string;
  };
}

export interface ParsedFeed {
  title: string;
  description: string;
  link: string;
  language?: string;
  items: FeedItem[];
  feedType: 'rss' | 'atom';
}
