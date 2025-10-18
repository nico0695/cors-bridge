import type { Request, Response } from 'express';
import type { MockEndpointService } from '../../application/services/MockEndpointService.js';
import type { Logger } from 'pino';

export class MockApiController {
  constructor(
    private readonly service: MockEndpointService,
    private readonly logger: Logger
  ) {}

  serve = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get the path after /api-mock/serve
      const requestPath = `/${req.params[0] || ''}`;

      this.logger.debug({ path: requestPath }, 'Looking up mock endpoint');

      const endpoint = this.service.getEndpointByPath(requestPath);

      if (!endpoint) {
        res.status(404).json({ error: 'Mock endpoint not found' });
        return;
      }

      if (!endpoint.enabled) {
        res.status(503).json({ error: 'Mock endpoint is disabled' });
        return;
      }

      // Apply delay if configured
      if (endpoint.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, endpoint.delayMs));
      }

      // Set content type
      res.setHeader('Content-Type', endpoint.contentType);

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, PATCH, OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
      );

      this.logger.info(
        {
          path: requestPath,
          statusCode: endpoint.statusCode,
          delayMs: endpoint.delayMs,
        },
        'Serving mock endpoint'
      );

      // Send response
      if (endpoint.contentType === 'application/json') {
        res.status(endpoint.statusCode).json(endpoint.responseData);
      } else {
        res.status(endpoint.statusCode).send(endpoint.responseData);
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to serve mock endpoint');
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
