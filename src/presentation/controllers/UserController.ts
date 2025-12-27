import type { Request, Response } from 'express';
import type { Logger } from 'pino';
import type { UserService } from '../../application/services/UserService.js';
import type {
  UpdateUserInput,
  UserRole,
  UserStatus,
} from '../../domain/User.js';

const isValidStatus = (value: unknown): value is UserStatus => {
  return value === 'enabled' || value === 'blocked';
};

const isValidRole = (value: unknown): value is UserRole => {
  return value === 'admin' || value === 'user';
};

export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: Logger
  ) {}

  list = (_req: Request, res: Response): void => {
    try {
      const users = this.userService.listUsers();
      res.json(users);
    } catch (error) {
      this.logger.error({ error }, 'Failed to list users');
      res.status(500).json({ error: 'Failed to list users' });
    }
  };

  register = (req: Request, res: Response): void => {
    try {
      const { name, password, email } = req.body ?? {};

      if (typeof name !== 'string' || typeof password !== 'string') {
        res
          .status(400)
          .json({ error: 'Name and password are required strings' });
        return;
      }

      const user = this.userService.createUser({
        name,
        password,
        email: typeof email === 'string' ? email : undefined,
        status: 'blocked',
      });

      res.status(201).json(user);
    } catch (error) {
      this.logger.error({ error }, 'Failed to register user');
      const message =
        error instanceof Error ? error.message : 'Failed to register user';
      res.status(400).json({ error: message });
    }
  };

  create = (req: Request, res: Response): void => {
    try {
      const { name, password, email, status, role } = req.body ?? {};

      if (this.userService.hasUsers() && !req.authUser) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (typeof name !== 'string' || typeof password !== 'string') {
        res
          .status(400)
          .json({ error: 'Name and password are required strings' });
        return;
      }

      if (status !== undefined && !isValidStatus(status)) {
        res.status(400).json({ error: 'Invalid user status' });
        return;
      }

      if (role !== undefined && !isValidRole(role)) {
        res.status(400).json({ error: 'Invalid user role' });
        return;
      }

      const user = this.userService.createUser({
        name,
        password,
        email: typeof email === 'string' ? email : undefined,
        status,
        role,
      });

      res.status(201).json(user);
    } catch (error) {
      this.logger.error({ error }, 'Failed to create user');
      const message =
        error instanceof Error ? error.message : 'Failed to create user';
      res.status(400).json({ error: message });
    }
  };

  update = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const { name, password, email, status, role } = req.body ?? {};

      const updates: UpdateUserInput = {};

      if (name !== undefined) {
        if (typeof name !== 'string') {
          res.status(400).json({ error: 'Name must be a string' });
          return;
        }
        updates.name = name;
      }

      if (password !== undefined) {
        if (typeof password !== 'string') {
          res.status(400).json({ error: 'Password must be a string' });
          return;
        }
        updates.password = password;
      }

      if (email !== undefined) {
        if (email === null) {
          updates.email = null;
        } else if (typeof email === 'string') {
          updates.email = email;
        } else {
          res.status(400).json({ error: 'Email must be a string or null' });
          return;
        }
      }

      if (status !== undefined) {
        if (!isValidStatus(status)) {
          res.status(400).json({ error: 'Invalid user status' });
          return;
        }
        updates.status = status;
      }

      if (role !== undefined) {
        if (!isValidRole(role)) {
          res.status(400).json({ error: 'Invalid user role' });
          return;
        }
        updates.role = role;
      }

      const updated = this.userService.updateUser(id, updates);

      if (!updated) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(updated);
    } catch (error) {
      this.logger.error({ error }, 'Failed to update user');
      const message =
        error instanceof Error ? error.message : 'Failed to update user';
      res.status(400).json({ error: message });
    }
  };

  delete = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const deleted = this.userService.deleteUser(id);

      if (!deleted) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      this.logger.error({ error }, 'Failed to delete user');
      res.status(500).json({ error: 'Failed to delete user' });
    }
  };
}
