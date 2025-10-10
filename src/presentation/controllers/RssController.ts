import { Request, Response } from 'express';
import { RssService } from '../../application/services/RssService.js';

export class RssController {
  constructor(private readonly rssService: RssService) {}

  async getFeed(req: Request, res: Response): Promise<void> {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'Missing ?url= parameter' });
      return;
    }

    try {
      const feed = await this.rssService.getFeed(url);
      if (feed) {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Content-Type', feed.contentType);
        res.send(feed.data);
      } else {
        res.status(404).json({ error: 'Feed not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
