import NodeCache from 'node-cache';
import type { Logger } from 'pino';

export interface CachedProxyResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  contentType: string | null;
  cachedAt: number;
}

export class ProxyResponseCache {
  private readonly cache: NodeCache;

  constructor(
    private readonly logger: Logger,
    ttlSeconds: number = 300, // default TTL 5 minutes
    maxKeys: number = 100
  ) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      maxKeys: maxKeys,
      useClones: false,
    });
  }

  get(url: string): CachedProxyResponse | null {
    const cached = this.cache.get<CachedProxyResponse>(url);
    if (cached) {
      this.logger.info(
        { url, cache: 'hit', age: Date.now() - cached.cachedAt },
        'Serving proxy response from cache'
      );
      return cached;
    }
    this.logger.info({ url, cache: 'miss' }, 'Cache miss for proxy request');
    return null;
  }

  set(url: string, response: CachedProxyResponse): void {
    this.cache.set(url, response);
    this.logger.info({ url, status: response.status }, 'Cached proxy response');
  }

  getStats() {
    return this.cache.getStats();
  }

  clear(): void {
    this.cache.flushAll();
  }
}
