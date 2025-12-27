import type { ProxyEndpointRepository } from '../repositories/ProxyEndpointRepository.js';
import type {
  ProxyEndpoint,
  CreateProxyEndpointDto,
  UpdateProxyEndpointDto,
} from '../../domain/ProxyEndpoint.js';

const MAX_ENDPOINTS = 50;
const MAX_DELAY_MS = 10000;

export class ProxyEndpointService {
  constructor(private readonly repository: ProxyEndpointRepository) {}

  getAllEndpoints(): ProxyEndpoint[] {
    return this.repository.findAll();
  }

  getEndpointById(id: string): ProxyEndpoint | null {
    return this.repository.findById(id);
  }

  getEndpointByPath(path: string): ProxyEndpoint | null {
    return this.repository.findByPath(path);
  }

  createEndpoint(dto: CreateProxyEndpointDto): ProxyEndpoint {
    if (this.repository.count() >= MAX_ENDPOINTS) {
      throw new Error(
        `Cannot create endpoint: maximum limit of ${MAX_ENDPOINTS} endpoints reached`
      );
    }

    const normalizedPath = dto.path.startsWith('/') ? dto.path : `/${dto.path}`;

    if (this.repository.findByPath(normalizedPath)) {
      throw new Error(`Endpoint with path ${normalizedPath} already exists`);
    }

    if (dto.baseUrl) {
      if (
        !dto.baseUrl.startsWith('http://') &&
        !dto.baseUrl.startsWith('https://')
      ) {
        throw new Error('Base URL must start with http:// or https://');
      }
    }

    if (
      dto.statusCodeOverride !== undefined &&
      (dto.statusCodeOverride < 100 || dto.statusCodeOverride > 599)
    ) {
      throw new Error('Status code override must be between 100 and 599');
    }

    const delayMs = dto.delayMs || 0;
    if (delayMs < 0 || delayMs > MAX_DELAY_MS) {
      throw new Error(`Delay must be between 0 and ${MAX_DELAY_MS}ms`);
    }

    return this.repository.save({
      ...dto,
      path: normalizedPath,
      useCache: dto.useCache || false,
    });
  }

  updateEndpoint(
    id: string,
    dto: UpdateProxyEndpointDto
  ): ProxyEndpoint | null {
    if (dto.path) {
      const normalizedPath = dto.path.startsWith('/')
        ? dto.path
        : `/${dto.path}`;
      const existing = this.repository.findByPath(normalizedPath);
      if (existing && existing.id !== id) {
        throw new Error(`Endpoint with path ${normalizedPath} already exists`);
      }
      dto.path = normalizedPath;
    }

    if (
      dto.baseUrl &&
      !dto.baseUrl.startsWith('http://') &&
      !dto.baseUrl.startsWith('https://')
    ) {
      throw new Error('Base URL must start with http:// or https://');
    }

    if (
      dto.statusCodeOverride !== undefined &&
      dto.statusCodeOverride !== null &&
      (dto.statusCodeOverride < 100 || dto.statusCodeOverride > 599)
    ) {
      throw new Error('Status code override must be between 100 and 599');
    }

    if (
      dto.delayMs !== undefined &&
      (dto.delayMs < 0 || dto.delayMs > MAX_DELAY_MS)
    ) {
      throw new Error(`Delay must be between 0 and ${MAX_DELAY_MS}ms`);
    }

    return this.repository.update(id, dto);
  }

  deleteEndpoint(id: string): boolean {
    return this.repository.delete(id);
  }

  getStats() {
    const all = this.repository.findAll();
    const enabled = all.filter((e) => e.enabled).length;
    return {
      total: all.length,
      enabled,
      disabled: all.length - enabled,
      maxEndpoints: MAX_ENDPOINTS,
      remaining: MAX_ENDPOINTS - all.length,
    };
  }
}
