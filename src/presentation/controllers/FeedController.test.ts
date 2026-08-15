import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Request, Response } from 'express';
import type { Logger } from 'pino';
import { FeedController } from './FeedController.js';
import type { FeedRepository } from '../../application/repositories/FeedRepository.js';

describe('FeedController', () => {
  let controller: FeedController;
  let repository: jest.Mocked<FeedRepository>;
  let logger: jest.Mocked<Logger>;
  let response: Partial<Response>;

  beforeEach(() => {
    repository = {
      findByUrl: jest.fn(),
      save: jest.fn(),
      getStats: jest.fn(),
    } as unknown as jest.Mocked<FeedRepository>;

    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    controller = new FeedController(repository, logger);

    response = {
      status: jest.fn().mockReturnThis() as unknown as Response['status'],
      json: jest.fn().mockReturnThis() as unknown as Response['json'],
      setHeader: jest.fn().mockReturnThis() as unknown as Response['setHeader'],
      send: jest.fn().mockReturnThis() as unknown as Response['send'],
    };
  });

  it('returns 400 for an invalid feed URL', async () => {
    const request = {
      query: { url: 'http://localhost:3000/feed.xml' },
    } as unknown as Request;

    await controller.getTransformedFeed(request, response as Response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: 'URL must not target localhost or private IP ranges',
    });
  });

  it('returns 400 for an invalid limit', async () => {
    const request = {
      query: { url: 'https://example.com/feed.xml', limit: '0' },
    } as unknown as Request;

    await controller.getTransformedFeed(request, response as Response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: 'limit must be between 1 and 50',
    });
  });

  it('returns 400 when merging too many feeds', async () => {
    const request = {
      query: {
        urls: [
          'https://a.example.com/feed.xml',
          'https://b.example.com/feed.xml',
          'https://c.example.com/feed.xml',
          'https://d.example.com/feed.xml',
          'https://e.example.com/feed.xml',
          'https://f.example.com/feed.xml',
        ].join(','),
      },
    } as unknown as Request;

    await controller.getMergedFeeds(request, response as Response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: 'urls must contain between 1 and 5 valid URLs',
    });
  });
});
