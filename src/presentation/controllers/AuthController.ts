import type { Request, Response } from 'express';
import type { Logger } from 'pino';
import type { UserService } from '../../application/services/UserService.js';

export class AuthController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: Logger
  ) {}

  login = async (req: Request, res: Response): Promise<void> => {
    const { name, password } = req.body ?? {};
    if (typeof name !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Name and password are required' });
      return;
    }

    try {
      const tokens = await this.userService.authenticate(name, password);
      res.json(tokens);
    } catch (error) {
      this.logger.warn({ error, name }, 'Failed login attempt');
      res.status(401).json({ error: 'Invalid credentials' });
    }
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body ?? {};
    if (typeof refreshToken !== 'string') {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    try {
      const tokens = await this.userService.refreshTokens(refreshToken);
      res.json(tokens);
    } catch (error) {
      this.logger.warn({ error }, 'Failed token refresh');
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  };
}
