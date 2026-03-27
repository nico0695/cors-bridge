import type { NextFunction, Request, Response } from 'express';
import type { Logger } from 'pino';

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  message?: string;
  category: string;
  keyGenerator?: (req: Request) => string;
};

const DEFAULT_MESSAGE = 'Too many requests, please try again later';

const getClientIp = (req: Request): string => {
  return req.ip || req.socket.remoteAddress || 'unknown';
};

export const createIpRateLimitKey = (req: Request): string => {
  return `ip:${getClientIp(req)}`;
};

export const createAuthUserOrIpRateLimitKey = (req: Request): string => {
  if (req.authUser?.id) {
    return `user:${req.authUser.id}`;
  }

  return createIpRateLimitKey(req);
};

export const createRateLimitMiddleware = (
  options: RateLimitOptions,
  logger: Logger
) => {
  const entries = new Map<string, RateLimitEntry>();
  const keyGenerator = options.keyGenerator ?? createIpRateLimitKey;
  const message = options.message ?? DEFAULT_MESSAGE;

  // TODO: Replace in-memory rate limiting with a shared store for multi-instance deployments.
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = keyGenerator(req);
    const record = entries.get(key);

    if (!record || now >= record.resetTime) {
      entries.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      next();
      return;
    }

    if (record.count >= options.max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((record.resetTime - now) / 1000)
      );

      logger.warn(
        {
          category: options.category,
          key,
          path: req.path,
          method: req.method,
          retryAfterSeconds,
        },
        'Rate limit exceeded'
      );

      res.setHeader('Retry-After', retryAfterSeconds.toString());
      res.status(429).json({ error: message });
      return;
    }

    record.count += 1;
    next();
  };
};
