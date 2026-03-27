import { Request, Response } from 'express';
import { RssService } from '../../application/services/RssService.js';
import { validatePublicHttpUrl } from '../../shared/validation/inputValidation.js';

export class RssController {
  constructor(private readonly rssService: RssService) {}

  async getFeed(req: Request, res: Response): Promise<void> {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'Missing ?url= parameter' });
      return;
    }

    let validatedUrl: string;
    try {
      validatedUrl = validatePublicHttpUrl(url);
    } catch (error) {
      res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'URL must start with http:// or https:// and be properly formatted',
      });
      return;
    }

    try {
      const feed = await this.rssService.getFeed(validatedUrl);
      if (feed) {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Content-Type', feed.contentType);
        res.send(feed.data);
      } else {
        res.status(404).json({ error: 'Feed not found' });
      }
    } catch (_error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
