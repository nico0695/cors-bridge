import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import type { Logger } from 'pino';
import {
  createAuthUserOrIpRateLimitKey,
  createIpRateLimitKey,
  createRateLimitMiddleware,
} from '../rateLimitMiddleware.js';

describe('rateLimitMiddleware', () => {
  let logger: jest.Mocked<Logger>;
  let response: Partial<Response>;
  let next: NextFunction;
  let nextMock: jest.Mock;

  beforeEach(() => {
    jest.useRealTimers();

    logger = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    response = {
      setHeader: jest.fn().mockReturnThis() as unknown as Response['setHeader'],
      status: jest.fn().mockReturnThis() as unknown as Response['status'],
      json: jest.fn().mockReturnThis() as unknown as Response['json'],
    };

    nextMock = jest.fn();
    next = nextMock as unknown as NextFunction;
  });

  it('allows requests until the configured limit is reached', () => {
    const middleware = createRateLimitMiddleware(
      {
        windowMs: 60_000,
        max: 2,
        category: 'test',
      },
      logger
    );

    const request = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      path: '/rss',
      method: 'GET',
    } as unknown as Request;

    middleware(request, response as Response, next);
    middleware(request, response as Response, next);

    expect(nextMock).toHaveBeenCalledTimes(2);
    expect(response.status).not.toHaveBeenCalled();
  });

  it('returns 429 and Retry-After when the limit is exceeded', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-26T12:00:00.000Z'));

    const middleware = createRateLimitMiddleware(
      {
        windowMs: 60_000,
        max: 1,
        category: 'auth',
      },
      logger
    );

    const request = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      path: '/api-auth/login',
      method: 'POST',
    } as unknown as Request;

    middleware(request, response as Response, next);
    middleware(request, response as Response, next);

    expect(nextMock).toHaveBeenCalledTimes(1);
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith({
      error: 'Too many requests, please try again later',
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('resets the counter after the window expires', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-26T12:00:00.000Z'));

    const middleware = createRateLimitMiddleware(
      {
        windowMs: 1_000,
        max: 1,
        category: 'feed',
      },
      logger
    );

    const request = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      path: '/rss',
      method: 'GET',
    } as unknown as Request;

    middleware(request, response as Response, next);

    jest.advanceTimersByTime(1_001);

    middleware(request, response as Response, next);

    expect(nextMock).toHaveBeenCalledTimes(2);
    expect(response.status).not.toHaveBeenCalled();
  });

  it('uses auth user id before ip when generating authenticated keys', () => {
    const request = {
      authUser: { id: 'user-123', name: 'alice', role: 'user' },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    expect(createAuthUserOrIpRateLimitKey(request)).toBe('user:user-123');
  });

  it('falls back to ip when no authenticated user is present', () => {
    const request = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    expect(createIpRateLimitKey(request)).toBe('ip:127.0.0.1');
    expect(createAuthUserOrIpRateLimitKey(request)).toBe('ip:127.0.0.1');
  });
});
