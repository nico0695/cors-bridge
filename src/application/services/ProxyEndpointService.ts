import type { ProxyEndpointRepository } from '../repositories/ProxyEndpointRepository.js';
import type {
  ProxyEndpoint,
  CreateProxyEndpointDto,
  UpdateProxyEndpointDto,
} from '../../domain/ProxyEndpoint.js';
import {
  normalizeEndpointPath,
  normalizeOptionalGroupId,
  normalizeRequiredName,
  validateDelayMs,
  validateHttpStatusCode,
  validatePublicHttpUrl,
} from '../../shared/validation/inputValidation.js';

const MAX_ENDPOINTS = 50;

export class ProxyEndpointService {
  constructor(private readonly repository: ProxyEndpointRepository) {}

  async getAllEndpoints(): Promise<ProxyEndpoint[]> {
    return this.repository.findAll();
  }

  async getEndpointById(id: string): Promise<ProxyEndpoint | null> {
    return this.repository.findById(id);
  }

  async getEndpointByPath(path: string): Promise<ProxyEndpoint | null> {
    return this.repository.findByPath(path);
  }

  async createEndpoint(dto: CreateProxyEndpointDto): Promise<ProxyEndpoint> {
    const count = await this.repository.count();
    if (count >= MAX_ENDPOINTS) {
      throw new Error(
        `Cannot create endpoint: maximum limit of ${MAX_ENDPOINTS} endpoints reached`
      );
    }

    const name = normalizeRequiredName(dto.name);
    const normalizedPath = normalizeEndpointPath(dto.path);
    const groupId = normalizeOptionalGroupId(dto.groupId);
    const baseUrl =
      dto.baseUrl === undefined
        ? undefined
        : validatePublicHttpUrl(dto.baseUrl, 'Base URL');

    const existing = await this.repository.findByPath(normalizedPath);
    if (existing) {
      throw new Error(`Endpoint with path ${normalizedPath} already exists`);
    }

    const statusCodeOverride =
      dto.statusCodeOverride === undefined
        ? undefined
        : validateHttpStatusCode(
            dto.statusCodeOverride,
            'Status code override'
          );
    const delayMs =
      dto.delayMs === undefined ? 0 : validateDelayMs(dto.delayMs);

    return this.repository.save({
      ...dto,
      name,
      path: normalizedPath,
      baseUrl,
      groupId,
      statusCodeOverride,
      delayMs,
      useCache: dto.useCache || false,
    });
  }

  async updateEndpoint(
    id: string,
    dto: UpdateProxyEndpointDto
  ): Promise<ProxyEndpoint | null> {
    if (dto.name !== undefined) {
      dto.name = normalizeRequiredName(dto.name);
    }

    if (dto.path !== undefined) {
      const normalizedPath = normalizeEndpointPath(dto.path);
      const existing = await this.repository.findByPath(normalizedPath);
      if (existing && existing.id !== id) {
        throw new Error(`Endpoint with path ${normalizedPath} already exists`);
      }
      dto.path = normalizedPath;
    }

    if (dto.groupId !== undefined) {
      dto.groupId = normalizeOptionalGroupId(dto.groupId);
    }

    if (dto.baseUrl !== undefined) {
      dto.baseUrl =
        dto.baseUrl === ''
          ? undefined
          : validatePublicHttpUrl(dto.baseUrl, 'Base URL');
    }

    if (
      dto.statusCodeOverride !== undefined &&
      dto.statusCodeOverride !== null
    ) {
      dto.statusCodeOverride = validateHttpStatusCode(
        dto.statusCodeOverride,
        'Status code override'
      );
    }

    if (dto.delayMs !== undefined) {
      dto.delayMs = validateDelayMs(dto.delayMs);
    }

    return this.repository.update(id, dto);
  }

  async deleteEndpoint(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  async getStats() {
    const all = await this.repository.findAll();
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
