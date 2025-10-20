import type { NextFunction, Request, Response } from 'express';
import type { Logger } from 'pino';
import type { UserService } from '../../application/services/UserService.js';

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: {
      id: string;
      name: string;
    };
  }
}

const extractToken = (header?: string): string | null => {
  if (!header) {
    return null;
  }
  if (!header.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
};

export const createAuthMiddleware = (
  userService: UserService,
  logger: Logger
): {
  attachAuthUserIfPresent: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void;
  requireAuth: (req: Request, res: Response, next: NextFunction) => void;
} => {
  const attachAuthUserIfPresent = (
    req: Request,
    _res: Response,
    next: NextFunction
  ): void => {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      next();
      return;
    }

    try {
      const user = userService.verifyAccessToken(token);
      req.authUser = { id: user.id, name: user.name };
    } catch (error) {
      logger.warn({ error }, 'Failed to attach auth user from token');
    } finally {
      next();
    }
  };

  const requireAuth = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    attachAuthUserIfPresent(req, res, () => {
      if (!req.authUser) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      next();
    });
  };

  return { attachAuthUserIfPresent, requireAuth };
};
