import { Feed } from '../../domain/Feed.js';

export interface FeedRepository {
  findByUrl(url: string): Promise<Feed | null>;
  save(url: string, feed: Feed): Promise<void>;
}
