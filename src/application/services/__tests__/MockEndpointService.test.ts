import { describe, expect, it, beforeEach } from '@jest/globals';
import { MockEndpointService } from '../MockEndpointService.js';
import type { MockEndpointRepository } from '../../repositories/MockEndpointRepository.js';
import type {
  MockEndpoint,
  CreateMockEndpointDto,
} from '../../../domain/MockEndpoint.js';

// Mock repository implementation
class MockEndpointRepositoryMock implements MockEndpointRepository {
  private endpoints: Map<string, MockEndpoint> = new Map();
  private idCounter = 1;

  findAll(): MockEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  findById(id: string): MockEndpoint | null {
    return this.endpoints.get(id) || null;
  }

  findByPath(path: string): MockEndpoint | null {
    return (
      Array.from(this.endpoints.values()).find((e) => e.path === path) || null
    );
  }

  save(dto: CreateMockEndpointDto): MockEndpoint {
    const id = `mock-${this.idCounter++}`;
    const now = new Date();
    const endpoint: MockEndpoint = {
      id,
      name: dto.name,
      path: dto.path,
      groupId: dto.groupId,
      responseData: dto.responseData,
      contentType: dto.contentType || 'application/json',
      statusCode: dto.statusCode || 200,
      enabled: dto.enabled !== false,
      delayMs: dto.delayMs || 0,
      createdAt: now,
      updatedAt: now,
    };
    this.endpoints.set(id, endpoint);
    return endpoint;
  }

  update(id: string, dto: any): MockEndpoint | null {
    const existing = this.endpoints.get(id);
    if (!existing) return null;

    const updated: MockEndpoint = {
      ...existing,
      ...dto,
      updatedAt: new Date(),
    };
    this.endpoints.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.endpoints.delete(id);
  }

  count(): number {
    return this.endpoints.size;
  }

  clear(): void {
    this.endpoints.clear();
  }
}

describe('MockEndpointService', () => {
  let service: MockEndpointService;
  let repository: MockEndpointRepositoryMock;

  beforeEach(() => {
    repository = new MockEndpointRepositoryMock();
    service = new MockEndpointService(repository);
  });

  describe('createEndpoint', () => {
    it('should create a new endpoint with valid data', () => {
      const dto: CreateMockEndpointDto = {
        name: 'Test Endpoint',
        path: '/test',
        responseData: { message: 'Hello' },
      };

      const result = service.createEndpoint(dto);

      expect(result.name).toBe('Test Endpoint');
      expect(result.path).toBe('/test');
      expect(result.responseData).toEqual({ message: 'Hello' });
      expect(result.contentType).toBe('application/json');
      expect(result.statusCode).toBe(200);
      expect(result.enabled).toBe(true);
    });

    it('should normalize path by adding leading slash', () => {
      const dto: CreateMockEndpointDto = {
        name: 'Test',
        path: 'test/path',
        responseData: {},
      };

      const result = service.createEndpoint(dto);

      expect(result.path).toBe('/test/path');
    });

    it('should throw error when creating duplicate path', () => {
      const dto: CreateMockEndpointDto = {
        name: 'Test',
        path: '/duplicate',
        responseData: {},
      };

      service.createEndpoint(dto);

      expect(() => service.createEndpoint(dto)).toThrow(
        'Endpoint with path /duplicate already exists'
      );
    });

    it('should throw error when max endpoints limit is reached', () => {
      // Create 50 endpoints
      for (let i = 0; i < 50; i++) {
        service.createEndpoint({
          name: `Endpoint ${i}`,
          path: `/endpoint-${i}`,
          responseData: {},
        });
      }

      // Try to create the 51st
      expect(() =>
        service.createEndpoint({
          name: 'Endpoint 51',
          path: '/endpoint-51',
          responseData: {},
        })
      ).toThrow(
        'Cannot create endpoint: maximum limit of 50 endpoints reached'
      );
    });

    it('should accept custom status code and delay', () => {
      const dto: CreateMockEndpointDto = {
        name: 'Custom',
        path: '/custom',
        responseData: { error: 'Not found' },
        statusCode: 404,
        delayMs: 1000,
      };

      const result = service.createEndpoint(dto);

      expect(result.statusCode).toBe(404);
      expect(result.delayMs).toBe(1000);
    });

    it('should accept group ID', () => {
      const dto: CreateMockEndpointDto = {
        name: 'Grouped',
        path: '/grouped',
        responseData: {},
        groupId: 'test-group',
      };

      const result = service.createEndpoint(dto);

      expect(result.groupId).toBe('test-group');
    });
  });

  describe('getAllEndpoints', () => {
    it('should return empty array when no endpoints exist', () => {
      const result = service.getAllEndpoints();
      expect(result).toEqual([]);
    });

    it('should return all endpoints', () => {
      service.createEndpoint({
        name: 'First',
        path: '/first',
        responseData: {},
      });
      service.createEndpoint({
        name: 'Second',
        path: '/second',
        responseData: {},
      });

      const result = service.getAllEndpoints();

      expect(result).toHaveLength(2);
    });
  });

  describe('getEndpointById', () => {
    it('should return endpoint by id', () => {
      const created = service.createEndpoint({
        name: 'Test',
        path: '/test',
        responseData: {},
      });

      const result = service.getEndpointById(created.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
    });

    it('should return null for non-existent id', () => {
      const result = service.getEndpointById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getEndpointByPath', () => {
    it('should return endpoint by path', () => {
      service.createEndpoint({
        name: 'Test',
        path: '/test',
        responseData: {},
      });

      const result = service.getEndpointByPath('/test');

      expect(result).toBeDefined();
      expect(result?.path).toBe('/test');
    });

    it('should return null for non-existent path', () => {
      const result = service.getEndpointByPath('/non-existent');
      expect(result).toBeNull();
    });
  });

  describe('updateEndpoint', () => {
    it('should update endpoint properties', () => {
      const created = service.createEndpoint({
        name: 'Original',
        path: '/original',
        responseData: { old: 'data' },
      });

      const updated = service.updateEndpoint(created.id, {
        name: 'Updated',
        responseData: { new: 'data' },
        statusCode: 201,
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated');
      expect(updated?.responseData).toEqual({ new: 'data' });
      expect(updated?.statusCode).toBe(201);
      expect(updated?.path).toBe('/original'); // Unchanged
    });

    it('should normalize path when updating', () => {
      const created = service.createEndpoint({
        name: 'Test',
        path: '/test',
        responseData: {},
      });

      const updated = service.updateEndpoint(created.id, {
        path: 'new-path',
      });

      expect(updated?.path).toBe('/new-path');
    });

    it('should throw error when updating to duplicate path', () => {
      const first = service.createEndpoint({
        name: 'First',
        path: '/first',
        responseData: {},
      });

      service.createEndpoint({
        name: 'Second',
        path: '/second',
        responseData: {},
      });

      expect(() =>
        service.updateEndpoint(first.id, { path: '/second' })
      ).toThrow('Endpoint with path /second already exists');
    });

    it('should return null for non-existent id', () => {
      const result = service.updateEndpoint('non-existent', {
        name: 'Updated',
      });
      expect(result).toBeNull();
    });
  });

  describe('deleteEndpoint', () => {
    it('should delete endpoint by id', () => {
      const created = service.createEndpoint({
        name: 'Test',
        path: '/test',
        responseData: {},
      });

      const result = service.deleteEndpoint(created.id);

      expect(result).toBe(true);
      expect(service.getEndpointById(created.id)).toBeNull();
    });

    it('should return false for non-existent id', () => {
      const result = service.deleteEndpoint('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', () => {
      service.createEndpoint({
        name: 'Enabled 1',
        path: '/enabled1',
        responseData: {},
        enabled: true,
      });

      service.createEndpoint({
        name: 'Enabled 2',
        path: '/enabled2',
        responseData: {},
        enabled: true,
      });

      service.createEndpoint({
        name: 'Disabled',
        path: '/disabled',
        responseData: {},
        enabled: false,
      });

      const stats = service.getStats();

      expect(stats.total).toBe(3);
      expect(stats.enabled).toBe(2);
      expect(stats.disabled).toBe(1);
      expect(stats.maxEndpoints).toBe(50);
      expect(stats.remaining).toBe(47);
    });

    it('should return zeros for empty state', () => {
      const stats = service.getStats();

      expect(stats.total).toBe(0);
      expect(stats.enabled).toBe(0);
      expect(stats.disabled).toBe(0);
      expect(stats.remaining).toBe(50);
    });
  });
});
