import type { MockEndpointRepository } from '../repositories/MockEndpointRepository.js';
import type {
  MockEndpoint,
  CreateMockEndpointDto,
  UpdateMockEndpointDto,
} from '../../domain/MockEndpoint.js';
import {
  normalizeEndpointPath,
  normalizeOptionalGroupId,
  normalizeRequiredName,
  validateDelayMs,
  validateHttpStatusCode,
  validateMockContentType,
  validateResponseData,
} from '../../shared/validation/inputValidation.js';

const MAX_ENDPOINTS = 50;

export class MockEndpointService {
  constructor(private readonly repository: MockEndpointRepository) {}

  async getAllEndpoints(): Promise<MockEndpoint[]> {
    return this.repository.findAll();
  }

  async getEndpointById(id: string): Promise<MockEndpoint | null> {
    return this.repository.findById(id);
  }

  async getEndpointByPath(path: string): Promise<MockEndpoint | null> {
    return this.repository.findByPath(path);
  }

  async createEndpoint(dto: CreateMockEndpointDto): Promise<MockEndpoint> {
    const count = await this.repository.count();
    if (count >= MAX_ENDPOINTS) {
      throw new Error(
        `Cannot create endpoint: maximum limit of ${MAX_ENDPOINTS} endpoints reached`
      );
    }

    const name = normalizeRequiredName(dto.name);
    const normalizedPath = normalizeEndpointPath(dto.path);
    const groupId = normalizeOptionalGroupId(dto.groupId);
    const contentType =
      dto.contentType === undefined
        ? 'application/json'
        : validateMockContentType(dto.contentType);
    const statusCode =
      dto.statusCode === undefined
        ? 200
        : validateHttpStatusCode(dto.statusCode, 'Status code');
    const delayMs =
      dto.delayMs === undefined ? 0 : validateDelayMs(dto.delayMs);

    validateResponseData(dto.responseData);

    const existing = await this.repository.findByPath(normalizedPath);
    if (existing) {
      throw new Error(`Endpoint with path ${normalizedPath} already exists`);
    }

    return this.repository.save({
      ...dto,
      name,
      path: normalizedPath,
      groupId,
      contentType,
      statusCode,
      delayMs,
    });
  }

  async updateEndpoint(
    id: string,
    dto: UpdateMockEndpointDto
  ): Promise<MockEndpoint | null> {
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

    if (dto.contentType !== undefined) {
      dto.contentType = validateMockContentType(dto.contentType);
    }

    if (dto.statusCode !== undefined) {
      dto.statusCode = validateHttpStatusCode(dto.statusCode, 'Status code');
    }

    if (dto.delayMs !== undefined) {
      dto.delayMs = validateDelayMs(dto.delayMs);
    }

    if (dto.responseData !== undefined) {
      validateResponseData(dto.responseData);
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
