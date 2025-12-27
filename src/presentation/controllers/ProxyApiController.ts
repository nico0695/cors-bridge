import type { Request, Response } from 'express';
import type { ProxyEndpointService } from '../../application/services/ProxyEndpointService.js';
import type { Logger } from 'pino';
import fetch from 'node-fetch';

export class ProxyApiController {
  constructor(
    private readonly service: ProxyEndpointService,
    private readonly logger: Logger
  ) {}

  forward = async (req: Request, res: Response): Promise<void> => {
    try {
      const requestPath = `/${req.params[0] || ''}`;

      this.logger.info(
        { requestPath, method: req.method },
        'Proxy request received'
      );

      const endpoint = this.service.getEndpointByPath(requestPath);

      if (!endpoint) {
        this.logger.warn({ requestPath }, 'Proxy endpoint not found');
        res.status(404).json({ error: 'Proxy endpoint not found' });
        return;
      }

      if (!endpoint.enabled) {
        this.logger.warn({ requestPath }, 'Proxy endpoint is disabled');
        res.status(503).json({ error: 'Proxy endpoint is disabled' });
        return;
      }

      // Apply delay if configured
      if (endpoint.delayMs > 0) {
        this.logger.info({ delayMs: endpoint.delayMs }, 'Applying delay');
        await new Promise((resolve) => setTimeout(resolve, endpoint.delayMs));
      }

      if (endpoint.statusCodeOverride) {
        this.logger.info(
          { path: requestPath, statusCode: endpoint.statusCodeOverride },
          'Returning override status without upstream call'
        );
        res.status(endpoint.statusCodeOverride).json({
          message: 'Endpoint configured with status override',
        });
        return;
      }

      const targetUrl = endpoint.baseUrl;

      const headersToForward = this.filterRequestHeaders(req.headers);

      this.logger.info(
        {
          path: requestPath,
          targetUrl,
          method: req.method,
          headersCount: Object.keys(headersToForward).length,
        },
        'Forwarding request to upstream'
      );

      const upstreamResponse = await fetch(targetUrl, {
        method: req.method,
        headers: headersToForward,
        body: this.shouldHaveBody(req.method)
          ? JSON.stringify(req.body)
          : undefined,
      });

      this.logger.info(
        { targetUrl, status: upstreamResponse.status },
        'Received response from upstream'
      );

      this.forwardResponseHeaders(upstreamResponse.headers, res);

      const responseData = await upstreamResponse.text();
      res.status(upstreamResponse.status).send(responseData);
    } catch (error) {
      this.logger.error({ error }, 'Failed to forward proxy request');
      res.status(502).json({ error: 'Bad Gateway - upstream request failed' });
    }
  };

  private filterRequestHeaders(
    headers: Request['headers']
  ): Record<string, string> {
    const filtered: Record<string, string> = {};
    const skipHeaders = new Set([
      'host',
      'connection',
      'content-length',
      'transfer-encoding',
      'upgrade',
      'proxy-connection',
      'keep-alive',
      'te',
    ]);

    for (const [key, value] of Object.entries(headers)) {
      if (!skipHeaders.has(key.toLowerCase()) && value) {
        filtered[key] = Array.isArray(value) ? value[0] : value;
      }
    }

    return filtered;
  }

  private forwardResponseHeaders(
    headers: import('node-fetch').Headers,
    res: Response
  ): void {
    const skipHeaders = new Set([
      'connection',
      'transfer-encoding',
      'content-encoding',
    ]);

    headers.forEach((value, key) => {
      if (!skipHeaders.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
  }

  private shouldHaveBody(method: string): boolean {
    return ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase());
  }
}
