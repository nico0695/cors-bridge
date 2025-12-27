import type { Request, Response } from 'express';
import type { ProxyEndpointService } from '../../application/services/ProxyEndpointService.js';
import type { Logger } from 'pino';
import fetch from 'node-fetch';
import type { ProxyResponseCache } from '../../infrastructure/cache/ProxyResponseCache.js';
import { extractAndValidateUrl } from '../utils/urlExtractor.js';

export class ProxyApiController {
  constructor(
    private readonly service: ProxyEndpointService,
    private readonly logger: Logger,
    private readonly cache: ProxyResponseCache
  ) {}

  forward = async (req: Request, res: Response): Promise<void> => {
    try {
      const requestPath = req.params[0] ? `/${req.params[0]}` : '';

      this.logger.info(
        { requestPath, method: req.method, hasUrl: !!req.query.url },
        'Proxy request received'
      );

      // MODE 1: Direct proxy mode (no path, just ?url=...)
      if (!requestPath) {
        return this.handleDirectProxy(req, res);
      }

      // MODE 2: Endpoint-based proxy (path exists)
      return this.handleEndpointProxy(requestPath, req, res);
    } catch (error) {
      this.logger.error({ error }, 'Failed to forward proxy request');
      res.status(502).json({ error: 'Bad Gateway - upstream request failed' });
    }
  };

  private handleDirectProxy = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { url, error } = extractAndValidateUrl(req);

    if (error || !url) {
      this.logger.warn({ error }, 'Direct proxy called with invalid URL');
      res.status(400).json({
        error: error || 'Invalid URL parameter',
        usage:
          'Use /api-proxy/serve?url=https://example.com (url must be the last query parameter)',
        example:
          '/api-proxy/serve?url=https://api.example.com/users?id=1&status=active',
      });
      return;
    }

    this.logger.info(
      { targetUrl: url, mode: 'direct' },
      'Direct proxy mode (no caching, no config)'
    );

    await this.forwardRequest(url, req, res, false);
  };

  private handleEndpointProxy = async (
    requestPath: string,
    req: Request,
    res: Response
  ): Promise<void> => {
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

    let targetUrl: string;

    const { url: queryUrl, error: urlError } = extractAndValidateUrl(req);

    if (queryUrl) {
      targetUrl = queryUrl;
      this.logger.info(
        {
          path: requestPath,
          targetUrl,
          mode: 'dynamic',
        },
        'Using runtime URL from query parameter'
      );
    } else if (endpoint.baseUrl) {
      targetUrl = endpoint.baseUrl;
      this.logger.info(
        {
          path: requestPath,
          targetUrl,
          mode: 'static',
        },
        'Using baseUrl from endpoint config'
      );
    } else {
      this.logger.warn(
        { path: requestPath, urlError },
        'Endpoint requires URL but none provided'
      );
      res.status(400).json({
        error: urlError || 'URL required',
        usage: `Use /api-proxy/serve${requestPath}?url=https://example.com (url must be the last query parameter)`,
        example: `/api-proxy/serve${requestPath}?url=https://api.example.com/users?id=1&status=active`,
      });
      return;
    }

    await this.forwardRequest(targetUrl, req, res, endpoint.useCache);
  };

  private forwardRequest = async (
    targetUrl: string,
    req: Request,
    res: Response,
    useCache: boolean
  ): Promise<void> => {
    if (useCache) {
      const cached = this.cache.get(targetUrl);
      if (cached) {
        this.logger.info(
          { targetUrl, age: Date.now() - cached.cachedAt },
          'Serving from cache'
        );

        // Restore cached headers
        Object.entries(cached.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });

        if (cached.contentType) {
          res.setHeader('Content-Type', cached.contentType);
        }

        res.status(cached.status).send(cached.body);
        return;
      }
    }

    const headersToForward = this.filterRequestHeaders(req.headers);

    this.logger.info(
      {
        targetUrl,
        method: req.method,
        headersCount: Object.keys(headersToForward).length,
        cacheEnabled: useCache,
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

    // Collect response headers
    const responseHeaders: Record<string, string> = {};
    this.forwardResponseHeaders(upstreamResponse.headers, res, responseHeaders);

    const responseData = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get('content-type');

    if (
      useCache &&
      upstreamResponse.status >= 200 &&
      upstreamResponse.status < 300
    ) {
      this.cache.set(targetUrl, {
        status: upstreamResponse.status,
        headers: responseHeaders,
        body: responseData,
        contentType,
        cachedAt: Date.now(),
      });
    }

    res.status(upstreamResponse.status).send(responseData);
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
    res: Response,
    collected?: Record<string, string>
  ): void {
    const skipHeaders = new Set([
      'connection',
      'transfer-encoding',
      'content-encoding',
    ]);

    headers.forEach((value, key) => {
      if (!skipHeaders.has(key.toLowerCase())) {
        res.setHeader(key, value);
        if (collected) {
          collected[key] = value;
        }
      }
    });
  }

  private shouldHaveBody(method: string): boolean {
    return ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase());
  }
}
