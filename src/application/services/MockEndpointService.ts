import type { MockEndpointRepository } from '../repositories/MockEndpointRepository.js';
import type {
  MockEndpoint,
  CreateMockEndpointDto,
  UpdateMockEndpointDto,
} from '../../domain/MockEndpoint.js';

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

    // Normalize path
    const normalizedPath = dto.path.startsWith('/') ? dto.path : `/${dto.path}`;

    // Check if path already exists
    const existing = await this.repository.findByPath(normalizedPath);
    if (existing) {
      throw new Error(`Endpoint with path ${normalizedPath} already exists`);
    }

    return this.repository.save({
      ...dto,
      path: normalizedPath,
    });
  }

  async updateEndpoint(
    id: string,
    dto: UpdateMockEndpointDto
  ): Promise<MockEndpoint | null> {
    // If path is being updated, normalize and check uniqueness
    if (dto.path) {
      const normalizedPath = dto.path.startsWith('/')
        ? dto.path
        : `/${dto.path}`;
      const existing = await this.repository.findByPath(normalizedPath);
      if (existing && existing.id !== id) {
        throw new Error(`Endpoint with path ${normalizedPath} already exists`);
      }
      dto.path = normalizedPath;
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
