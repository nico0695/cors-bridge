import type { Request, Response } from 'express';
import type { ProxyEndpointService } from '../../application/services/ProxyEndpointService.js';
import type { Logger } from 'pino';

export class ProxyManagementController {
  constructor(
    private readonly service: ProxyEndpointService,
    private readonly logger: Logger
  ) {}

  getAll = (req: Request, res: Response): void => {
    try {
      const endpoints = this.service.getAllEndpoints();
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(endpoints);
    } catch (error) {
      this.logger.error({ error }, 'Failed to get all proxy endpoints');
      res.status(500).json({ error: 'Failed to get proxy endpoints' });
    }
  };

  getById = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const endpoint = this.service.getEndpointById(id);

      if (!endpoint) {
        res.status(404).json({ error: 'Proxy endpoint not found' });
        return;
      }

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(endpoint);
    } catch (error) {
      this.logger.error({ error }, 'Failed to get proxy endpoint by id');
      res.status(500).json({ error: 'Failed to get proxy endpoint' });
    }
  };

  create = (req: Request, res: Response): void => {
    try {
      const endpoint = this.service.createEndpoint(req.body);
      res.status(201).json(endpoint);
    } catch (error) {
      this.logger.error({ error }, 'Failed to create proxy endpoint');
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create proxy endpoint';
      res.status(400).json({ error: message });
    }
  };

  update = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const endpoint = this.service.updateEndpoint(id, req.body);

      if (!endpoint) {
        res.status(404).json({ error: 'Proxy endpoint not found' });
        return;
      }

      res.json(endpoint);
    } catch (error) {
      this.logger.error({ error }, 'Failed to update proxy endpoint');
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update proxy endpoint';
      res.status(400).json({ error: message });
    }
  };

  delete = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const deleted = this.service.deleteEndpoint(id);

      if (!deleted) {
        res.status(404).json({ error: 'Proxy endpoint not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      this.logger.error({ error }, 'Failed to delete proxy endpoint');
      res.status(500).json({ error: 'Failed to delete proxy endpoint' });
    }
  };

  getStats = (req: Request, res: Response): void => {
    try {
      const stats = this.service.getStats();
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(stats);
    } catch (error) {
      this.logger.error({ error }, 'Failed to get proxy stats');
      res.status(500).json({ error: 'Failed to get proxy stats' });
    }
  };
}
