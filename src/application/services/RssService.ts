import { FeedRepository } from '../repositories/FeedRepository.js';
import { Feed } from '../../domain/Feed.js';

export class RssService {
  constructor(private readonly feedRepository: FeedRepository) {}

  async getFeed(url: string): Promise<Feed | null> {
    return this.feedRepository.findByUrl(url);
  }
}
