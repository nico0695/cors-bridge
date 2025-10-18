import type { Request, Response } from 'express';
import type { MockEndpointService } from '../../application/services/MockEndpointService.js';
import type { Logger } from 'pino';

export class MockManagementController {
  constructor(
    private readonly service: MockEndpointService,
    private readonly logger: Logger
  ) {}

  getAll = (req: Request, res: Response): void => {
    try {
      const endpoints = this.service.getAllEndpoints();
      res.json(endpoints);
    } catch (error) {
      this.logger.error({ error }, 'Failed to get all endpoints');
      res.status(500).json({ error: 'Failed to get endpoints' });
    }
  };

  getById = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const endpoint = this.service.getEndpointById(id);

      if (!endpoint) {
        res.status(404).json({ error: 'Endpoint not found' });
        return;
      }

      res.json(endpoint);
    } catch (error) {
      this.logger.error({ error }, 'Failed to get endpoint by id');
      res.status(500).json({ error: 'Failed to get endpoint' });
    }
  };

  create = (req: Request, res: Response): void => {
    try {
      const endpoint = this.service.createEndpoint(req.body);
      res.status(201).json(endpoint);
    } catch (error) {
      this.logger.error({ error }, 'Failed to create endpoint');
      const message =
        error instanceof Error ? error.message : 'Failed to create endpoint';
      res.status(400).json({ error: message });
    }
  };

  update = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const endpoint = this.service.updateEndpoint(id, req.body);

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

  delete = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const deleted = this.service.deleteEndpoint(id);

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

  getStats = (req: Request, res: Response): void => {
    try {
      const stats = this.service.getStats();
      res.json(stats);
    } catch (error) {
      this.logger.error({ error }, 'Failed to get stats');
      res.status(500).json({ error: 'Failed to get stats' });
    }
  };
}
