import type { Request, Response } from 'express';
import type { CrudService } from '../../application/services/CrudService.js';
import {
  ForbiddenError,
  ValidationError,
} from '../../application/services/CrudService.js';
import type { Logger } from 'pino';

export class CrudManagementController {
  constructor(
    private readonly service: CrudService,
    private readonly logger: Logger
  ) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const requesterId = req.authUser!.id;
      const requesterRole = req.authUser!.role ?? 'user';
      const tables = await this.service.getAllTables(
        requesterId,
        requesterRole
      );
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(tables);
    } catch (error) {
      this.logger.error({ error }, 'Failed to get all CRUD tables');
      res.status(500).json({ error: 'Failed to get CRUD tables' });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const requesterId = req.authUser!.id;
      const requesterRole = req.authUser!.role ?? 'user';
      const table = await this.service.getTableById(
        id,
        requesterId,
        requesterRole
      );

      if (!table) {
        res.status(404).json({ error: 'CRUD table not found' });
        return;
      }

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(table);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        res.status(403).json({ error: error.message });
        return;
      }
      this.logger.error({ error }, 'Failed to get CRUD table by id');
      res.status(500).json({ error: 'Failed to get CRUD table' });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const requesterId = req.authUser!.id;
      const requesterRole = req.authUser!.role ?? 'user';
      const table = await this.service.createTable(
        req.body,
        requesterId,
        requesterRole
      );
      res.status(201).json(table);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      this.logger.error({ error }, 'Failed to create CRUD table');
      const message =
        error instanceof Error ? error.message : 'Failed to create CRUD table';
      res.status(400).json({ error: message });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const requesterId = req.authUser!.id;
      const requesterRole = req.authUser!.role ?? 'user';
      const table = await this.service.updateTable(
        id,
        req.body,
        requesterId,
        requesterRole
      );

      if (!table) {
        res.status(404).json({ error: 'CRUD table not found' });
        return;
      }

      res.json(table);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        res.status(403).json({ error: error.message });
        return;
      }
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      this.logger.error({ error }, 'Failed to update CRUD table');
      const message =
        error instanceof Error ? error.message : 'Failed to update CRUD table';
      res.status(400).json({ error: message });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const requesterId = req.authUser!.id;
      const requesterRole = req.authUser!.role ?? 'user';
      const deleted = await this.service.deleteTable(
        id,
        requesterId,
        requesterRole
      );

      if (!deleted) {
        res.status(404).json({ error: 'CRUD table not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        res.status(403).json({ error: error.message });
        return;
      }
      this.logger.error({ error }, 'Failed to delete CRUD table');
      res.status(500).json({ error: 'Failed to delete CRUD table' });
    }
  };

  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const requesterId = req.authUser!.id;
      const requesterRole = req.authUser!.role ?? 'user';
      const stats = await this.service.getStats(requesterId, requesterRole);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(stats);
    } catch (error) {
      this.logger.error({ error }, 'Failed to get CRUD stats');
      res.status(500).json({ error: 'Failed to get CRUD stats' });
    }
  };
}
