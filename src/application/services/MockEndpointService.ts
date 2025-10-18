import type { MockEndpointRepository } from '../repositories/MockEndpointRepository.js';
import type {
  MockEndpoint,
  CreateMockEndpointDto,
  UpdateMockEndpointDto,
} from '../../domain/MockEndpoint.js';

const MAX_ENDPOINTS = 50;

export class MockEndpointService {
  constructor(private readonly repository: MockEndpointRepository) {}

  getAllEndpoints(): MockEndpoint[] {
    return this.repository.findAll();
  }

  getEndpointById(id: string): MockEndpoint | null {
    return this.repository.findById(id);
  }

  getEndpointByPath(path: string): MockEndpoint | null {
    return this.repository.findByPath(path);
  }

  createEndpoint(dto: CreateMockEndpointDto): MockEndpoint {
    if (this.repository.count() >= MAX_ENDPOINTS) {
      throw new Error(
        `Cannot create endpoint: maximum limit of ${MAX_ENDPOINTS} endpoints reached`
      );
    }

    // Normalize path
    const normalizedPath = dto.path.startsWith('/') ? dto.path : `/${dto.path}`;

    // Check if path already exists
    if (this.repository.findByPath(normalizedPath)) {
      throw new Error(`Endpoint with path ${normalizedPath} already exists`);
    }

    return this.repository.save({
      ...dto,
      path: normalizedPath,
    });
  }

  updateEndpoint(id: string, dto: UpdateMockEndpointDto): MockEndpoint | null {
    // If path is being updated, normalize and check uniqueness
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
