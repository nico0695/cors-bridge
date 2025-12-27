import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../../domain/User.js';
import type { Logger } from 'pino';

/**
 * Factory function that creates a middleware to require a specific role.
 * Must be used AFTER requireAuth middleware.
 *
 * @param requiredRole - The role required to access the endpoint
 * @param logger - Pino logger instance
 * @returns Express middleware function
 */
export const createRequireRole = (requiredRole: UserRole, logger: Logger) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      logger.warn('requireRole called without authenticated user');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.authUser.role !== requiredRole) {
      logger.warn(
        { userId: req.authUser.id, requiredRole, userRole: req.authUser.role },
        'User lacks required role'
      );
      res.status(403).json({
        error: 'Forbidden: Insufficient permissions',
        required: requiredRole,
      });
      return;
    }

    next();
  };
};

/**
 * Factory function that creates a middleware to require ANY of the specified roles.
 * Must be used AFTER requireAuth middleware.
 *
 * @param allowedRoles - Array of roles that are allowed to access the endpoint
 * @param logger - Pino logger instance
 * @returns Express middleware function
 */
export const createRequireAnyRole = (
  allowedRoles: UserRole[],
  logger: Logger
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Ensure user is authenticated (should be set by requireAuth middleware)
    if (!req.authUser) {
      logger.warn('requireAnyRole called without authenticated user');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if user has any of the allowed roles
    if (!req.authUser.role || !allowedRoles.includes(req.authUser.role)) {
      logger.warn(
        { userId: req.authUser.id, allowedRoles, userRole: req.authUser.role },
        'User lacks any of the required roles'
      );
      res.status(403).json({
        error: 'Forbidden: Insufficient permissions',
        requiredAny: allowedRoles,
      });
      return;
    }

    next();
  };
};
