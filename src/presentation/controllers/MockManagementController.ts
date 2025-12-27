import type { Request, Response } from 'express';
import type { MockEndpointService } from '../../application/services/MockEndpointService.js';
import type { Logger } from 'pino';

export class MockManagementController {
  constructor(
    private readonly service: MockEndpointService,
    private readonly logger: Logger
  ) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const endpoints = await this.service.getAllEndpoints();
      // Prevent caching for dynamic data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(endpoints);
    } catch (error) {
      this.logger.error({ error }, 'Failed to get all endpoints');
      res.status(500).json({ error: 'Failed to get endpoints' });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const endpoint = await this.service.getEndpointById(id);

      if (!endpoint) {
        res.status(404).json({ error: 'Endpoint not found' });
        return;
      }

      // Prevent caching for dynamic data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(endpoint);
    } catch (error) {
      this.logger.error({ error }, 'Failed to get endpoint by id');
      res.status(500).json({ error: 'Failed to get endpoint' });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const endpoint = await this.service.createEndpoint(req.body);
      res.status(201).json(endpoint);
    } catch (error) {
      this.logger.error({ error }, 'Failed to create endpoint');
      const message =
        error instanceof Error ? error.message : 'Failed to create endpoint';
      res.status(400).json({ error: message });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const endpoint = await this.service.updateEndpoint(id, req.body);

      if (!endpoint) {
        res.status(404).json({ error: 'Endpoint not found' });
        return;
      }

      res.json(endpoint);
    } catch (error) {
      this.logger.error({ error }, 'Failed to update endpoint');
      const message =
        error instanceof Error ? error.message : 'Failed to update endpoint';
      res.status(400).json({ error: message });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.service.deleteEndpoint(id);

      if (!deleted) {
        res.status(404).json({ error: 'Endpoint not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      this.logger.error({ error }, 'Failed to delete endpoint');
      res.status(500).json({ error: 'Failed to delete endpoint' });
    }
  };

  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.service.getStats();
      // Prevent caching for dynamic stats
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(stats);
    } catch (error) {
      this.logger.error({ error }, 'Failed to get stats');
      res.status(500).json({ error: 'Failed to get stats' });
    }
  };
}
