import type { Request, Response } from 'express';
import type { CrudService } from '../../application/services/CrudService.js';
import {
  NotFoundError,
  DisabledError,
  ValidationError,
  MaxEntriesError,
} from '../../application/services/CrudService.js';
import type { Logger } from 'pino';

export class CrudApiController {
  constructor(
    private readonly service: CrudService,
    private readonly logger: Logger
  ) {}

  serve = async (req: Request, res: Response): Promise<void> => {
    const raw = req.params[0] || '';
    const segments = raw.split('/').filter(Boolean);
    const basePath = segments[0];
    const entryId = segments[1];

    if (!basePath) {
      res.status(400).json({ error: 'basePath is required' });
      return;
    }

    switch (req.method) {
      case 'GET':
        return entryId
          ? this.getEntry(basePath, entryId, res)
          : this.listEntries(basePath, res);
      case 'POST':
        return entryId
          ? this.methodNotAllowed(res)
          : this.createEntry(basePath, req.body, res);
      case 'PUT':
        return entryId
          ? this.updateEntry(basePath, entryId, req.body, false, res)
          : this.methodNotAllowed(res);
      case 'PATCH':
        return entryId
          ? this.updateEntry(basePath, entryId, req.body, true, res)
          : this.methodNotAllowed(res);
      case 'DELETE':
        return entryId
          ? this.deleteEntry(basePath, entryId, res)
          : this.methodNotAllowed(res);
      default:
        return this.methodNotAllowed(res);
    }
  };

  private async listEntries(basePath: string, res: Response): Promise<void> {
    try {
      const entries = await this.service.listEntries(basePath);
      res.json(entries);
    } catch (error) {
      this.handleServeError(error, res, basePath);
    }
  }

  private async getEntry(
    basePath: string,
    entryId: string,
    res: Response
  ): Promise<void> {
    try {
      const entry = await this.service.getEntry(basePath, entryId);
      if (!entry) {
        res.status(404).json({ error: 'Entry not found' });
        return;
      }
      res.json(entry);
    } catch (error) {
      this.handleServeError(error, res, basePath);
    }
  }

  private async createEntry(
    basePath: string,
    body: unknown,
    res: Response
  ): Promise<void> {
    try {
      const entry = await this.service.createEntry(basePath, body);
      res.status(201).json(entry);
    } catch (error) {
      this.handleServeError(error, res, basePath);
    }
  }

  private async updateEntry(
    basePath: string,
    entryId: string,
    body: unknown,
    isPatch: boolean,
    res: Response
  ): Promise<void> {
    try {
      const entry = await this.service.updateEntry(
        basePath,
        entryId,
        body,
        isPatch
      );
      if (!entry) {
        res.status(404).json({ error: 'Entry not found' });
        return;
      }
      res.json(entry);
    } catch (error) {
      this.handleServeError(error, res, basePath);
    }
  }

  private async deleteEntry(
    basePath: string,
    entryId: string,
    res: Response
  ): Promise<void> {
    try {
      const deleted = await this.service.deleteEntry(basePath, entryId);
      if (!deleted) {
        res.status(404).json({ error: 'Entry not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      this.handleServeError(error, res, basePath);
    }
  }

  private handleServeError(
    error: unknown,
    res: Response,
    basePath: string
  ): void {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof DisabledError) {
      res.status(503).json({ error: error.message });
      return;
    }
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof MaxEntriesError) {
      res.status(422).json({ error: error.message });
      return;
    }
    this.logger.error({ error, basePath }, 'Unexpected error in CRUD serve');
    res.status(500).json({ error: 'Internal server error' });
  }

  private methodNotAllowed(res: Response): void {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
