import type { Request, Response } from 'express';
import type { Logger } from 'pino';
import type { FeedRepository } from '../../application/repositories/FeedRepository.js';
import { FeedParser } from '../../infrastructure/utils/FeedParser.js';
import { FeedTransformService } from '../../application/services/FeedTransformService.js';
import { FormatConversionService } from '../../application/services/FormatConversionService.js';
import { ContentEnhancementService } from '../../application/services/ContentEnhancementService.js';
import {
  InputValidationError,
  parseOptionalPositiveInt,
  validateEnumValue,
  validateIsoDateString,
  validatePublicHttpUrl,
} from '../../shared/validation/inputValidation.js';

export class FeedController {
  private feedParser: FeedParser;
  private transformService: FeedTransformService;
  private conversionService: FormatConversionService;
  private enhancementService: ContentEnhancementService;

  constructor(
    private feedRepository: FeedRepository,
    private logger: Logger
  ) {
    this.feedParser = new FeedParser();
    this.transformService = new FeedTransformService();
    this.conversionService = new FormatConversionService();
    this.enhancementService = new ContentEnhancementService(logger);
  }

  async getTransformedFeed(req: Request, res: Response): Promise<void> {
    try {
      const url = this.requireFeedUrl(req.query.url);
      const fromDate = validateIsoDateString(req.query.fromDate, 'fromDate');
      const toDate = validateIsoDateString(req.query.toDate, 'toDate');
      if (fromDate && toDate && Date.parse(fromDate) > Date.parse(toDate)) {
        res
          .status(400)
          .json({ error: 'fromDate must be earlier than or equal to toDate' });
        return;
      }

      const sortBy = validateEnumValue(req.query.sortBy, 'sortBy', [
        'date',
        'title',
      ] as const);
      const order = validateEnumValue(req.query.order, 'order', [
        'asc',
        'desc',
      ] as const);
      const format = validateEnumValue(req.query.format, 'format', [
        'rss',
        'atom',
        'json',
      ] as const);
      const limit = parseOptionalPositiveInt(req.query.limit, 'limit', 50);

      this.logger.info({ url }, 'Fetching feed for transformation');

      // Fetch feed
      const feedData = await this.feedRepository.findByUrl(url);
      if (!feedData) {
        res.status(404).json({ error: 'Feed not found' });
        return;
      }
      const parsedFeed = this.feedParser.parse(feedData.data);

      // Apply filters
      const filterOptions = {
        keywords: req.query.keywords
          ? (req.query.keywords as string).split(',')
          : undefined,
        excludeKeywords: req.query.exclude
          ? (req.query.exclude as string).split(',')
          : undefined,
        fromDate,
        toDate,
        categories: req.query.categories
          ? (req.query.categories as string).split(',')
          : undefined,
        limit,
      };

      let transformedFeed = this.transformService.filter(
        parsedFeed,
        filterOptions
      );

      // Apply sorting
      if (sortBy) {
        transformedFeed = this.transformService.sort(transformedFeed, {
          by: sortBy,
          order: order || 'desc',
        });
      }

      // Convert to requested format
      let output: string;
      let contentType: string;

      if ((format || 'rss') === 'json') {
        output = this.conversionService.toJSON(transformedFeed);
        contentType = 'application/json';
      } else if ((format || 'rss') === 'atom') {
        output = this.conversionService.toAtom(transformedFeed);
        contentType = 'application/atom+xml';
      } else {
        output = this.conversionService.toRSS(transformedFeed);
        contentType = 'application/rss+xml';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(output);
    } catch (error) {
      if (error instanceof InputValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      this.logger.error(
        { error: (error as Error).message },
        'Error transforming feed'
      );
      res.status(500).json({ error: 'Failed to transform feed' });
    }
  }

  async getMergedFeeds(req: Request, res: Response): Promise<void> {
    try {
      const urls = req.query.urls as string;
      if (!urls) {
        res
          .status(400)
          .json({ error: 'URLs parameter is required (comma-separated)' });
        return;
      }

      const urlList = urls
        .split(',')
        .map((u) => validatePublicHttpUrl(u, 'URL'))
        .filter(Boolean);
      if (urlList.length === 0 || urlList.length > 5) {
        res
          .status(400)
          .json({ error: 'urls must contain between 1 and 5 valid URLs' });
        return;
      }
      const format = validateEnumValue(req.query.format, 'format', [
        'rss',
        'atom',
        'json',
      ] as const);
      const limit = parseOptionalPositiveInt(req.query.limit, 'limit', 50);

      this.logger.info({ urls: urlList }, 'Merging feeds');

      // Fetch all feeds
      const feedsData = await Promise.all(
        urlList.map((url) => this.feedRepository.findByUrl(url))
      );

      // Filter out null feeds and parse
      const parsedFeeds = feedsData
        .filter(
          (feedData): feedData is NonNullable<typeof feedData> =>
            feedData !== null
        )
        .map((feedData) => this.feedParser.parse(feedData.data));

      // Merge feeds
      const mergedFeed = this.transformService.merge(parsedFeeds);

      // Apply limit if specified
      const finalFeed = limit
        ? this.transformService.filter(mergedFeed, { limit })
        : mergedFeed;

      // Convert to requested format
      let output: string;
      let contentType: string;

      if ((format || 'rss') === 'json') {
        output = this.conversionService.toJSON(finalFeed);
        contentType = 'application/json';
      } else if ((format || 'rss') === 'atom') {
        output = this.conversionService.toAtom(finalFeed);
        contentType = 'application/atom+xml';
      } else {
        output = this.conversionService.toRSS(finalFeed);
        contentType = 'application/rss+xml';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(output);
    } catch (error) {
      if (error instanceof InputValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      this.logger.error(
        { error: (error as Error).message },
        'Error merging feeds'
      );
      res.status(500).json({ error: 'Failed to merge feeds' });
    }
  }

  async getEnhancedFeed(req: Request, res: Response): Promise<void> {
    try {
      const url = this.requireFeedUrl(req.query.url);
      const format = validateEnumValue(req.query.format, 'format', [
        'rss',
        'atom',
        'json',
      ] as const);

      this.logger.info({ url }, 'Fetching feed for enhancement');

      // Fetch feed
      const feedData = await this.feedRepository.findByUrl(url);
      if (!feedData) {
        res.status(404).json({ error: 'Feed not found' });
        return;
      }
      const parsedFeed = this.feedParser.parse(feedData.data);

      // Enhance with full text
      const enhancedFeed =
        await this.enhancementService.enhanceWithFullText(parsedFeed);

      // Add metadata
      const finalFeed = this.enhancementService.extractMetadata(enhancedFeed);

      // Convert to requested format
      let output: string;
      let contentType: string;

      if ((format || 'rss') === 'json') {
        output = this.conversionService.toJSON(finalFeed);
        contentType = 'application/json';
      } else if ((format || 'rss') === 'atom') {
        output = this.conversionService.toAtom(finalFeed);
        contentType = 'application/atom+xml';
      } else {
        output = this.conversionService.toRSS(finalFeed);
        contentType = 'application/rss+xml';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(output);
    } catch (error) {
      if (error instanceof InputValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      this.logger.error(
        { error: (error as Error).message },
        'Error enhancing feed'
      );
      res.status(500).json({ error: 'Failed to enhance feed' });
    }
  }

  private requireFeedUrl(raw: unknown): string {
    if (!raw || typeof raw !== 'string') {
      throw new InputValidationError('URL parameter is required');
    }

    return validatePublicHttpUrl(raw);
  }
}
