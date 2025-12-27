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

  async findAll(): Promise<MockEndpoint[]> {
    return Array.from(this.endpoints.values());
  }

  async findById(id: string): Promise<MockEndpoint | null> {
    return this.endpoints.get(id) || null;
  }

  async findByPath(path: string): Promise<MockEndpoint | null> {
    return (
      Array.from(this.endpoints.values()).find((e) => e.path === path) || null
    );
  }

  async save(dto: CreateMockEndpointDto): Promise<MockEndpoint> {
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

  async update(id: string, dto: any): Promise<MockEndpoint | null> {
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

  async delete(id: string): Promise<boolean> {
    return this.endpoints.delete(id);
  }

  async count(): Promise<number> {
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
    it('should create a new endpoint with valid data', async () => {
      const dto: CreateMockEndpointDto = {
        name: 'Test Endpoint',
        path: '/test',
        responseData: { message: 'Hello' },
      };

      const result = await service.createEndpoint(dto);

      expect(result.name).toBe('Test Endpoint');
      expect(result.path).toBe('/test');
      expect(result.responseData).toEqual({ message: 'Hello' });
      expect(result.contentType).toBe('application/json');
      expect(result.statusCode).toBe(200);
      expect(result.enabled).toBe(true);
    });

    it('should normalize path by adding leading slash', async () => {
      const dto: CreateMockEndpointDto = {
        name: 'Test',
        path: 'test/path',
        responseData: {},
      };

      const result = await service.createEndpoint(dto);

      expect(result.path).toBe('/test/path');
    });

    it('should throw error when creating duplicate path', async () => {
      const dto: CreateMockEndpointDto = {
        name: 'Test',
        path: '/duplicate',
        responseData: {},
      };

      await service.createEndpoint(dto);

      await expect(async () => await service.createEndpoint(dto)).rejects.toThrow(
        'Endpoint with path /duplicate already exists'
      );
    });

    it('should throw error when max endpoints limit is reached', async () => {
      // Create 50 endpoints
      for (let i = 0; i < 50; i++) {
        await service.createEndpoint({
          name: `Endpoint ${i}`,
          path: `/endpoint-${i}`,
          responseData: {},
        });
      }

      // Try to create the 51st
      await expect(async () =>
        await service.createEndpoint({
          name: 'Endpoint 51',
          path: '/endpoint-51',
          responseData: {},
        })
      ).rejects.toThrow(
        'Cannot create endpoint: maximum limit of 50 endpoints reached'
      );
    });

    it('should accept custom status code and delay', async () => {
      const dto: CreateMockEndpointDto = {
        name: 'Custom',
        path: '/custom',
        responseData: { error: 'Not found' },
        statusCode: 404,
        delayMs: 1000,
      };

      const result = await service.createEndpoint(dto);

      expect(result.statusCode).toBe(404);
      expect(result.delayMs).toBe(1000);
    });

    it('should accept group ID', async () => {
      const dto: CreateMockEndpointDto = {
        name: 'Grouped',
        path: '/grouped',
        responseData: {},
        groupId: 'test-group',
      };

      const result = await service.createEndpoint(dto);

      expect(result.groupId).toBe('test-group');
    });
  });

  describe('getAllEndpoints', () => {
    it('should return empty array when no endpoints exist', async () => {
      const result = await service.getAllEndpoints();
      expect(result).toEqual([]);
    });

    it('should return all endpoints', async () => {
      await service.createEndpoint({
        name: 'First',
        path: '/first',
        responseData: {},
      });
      await service.createEndpoint({
        name: 'Second',
        path: '/second',
        responseData: {},
      });

      const result = await service.getAllEndpoints();

      expect(result).toHaveLength(2);
    });
  });

  describe('getEndpointById', () => {
    it('should return endpoint by id', async () => {
      const created = await service.createEndpoint({
        name: 'Test',
        path: '/test',
        responseData: {},
      });

      const result = await service.getEndpointById(created.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
    });

    it('should return null for non-existent id', async () => {
      const result = await service.getEndpointById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getEndpointByPath', () => {
    it('should return endpoint by path', async () => {
      await service.createEndpoint({
        name: 'Test',
        path: '/test',
        responseData: {},
      });

      const result = await service.getEndpointByPath('/test');

      expect(result).toBeDefined();
      expect(result?.path).toBe('/test');
    });

    it('should return null for non-existent path', async () => {
      const result = await service.getEndpointByPath('/non-existent');
      expect(result).toBeNull();
    });
  });

  describe('updateEndpoint', () => {
    it('should update endpoint properties', async () => {
      const created = await service.createEndpoint({
        name: 'Original',
        path: '/original',
        responseData: { old: 'data' },
      });

      const updated = await service.updateEndpoint(created.id, {
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

    it('should normalize path when updating', async () => {
      const created = await service.createEndpoint({
        name: 'Test',
        path: '/test',
        responseData: {},
      });

      const updated = await service.updateEndpoint(created.id, {
        path: 'new-path',
      });

      expect(updated?.path).toBe('/new-path');
    });

    it('should throw error when updating to duplicate path', async () => {
      const first = await service.createEndpoint({
        name: 'First',
        path: '/first',
        responseData: {},
      });

      await service.createEndpoint({
        name: 'Second',
        path: '/second',
        responseData: {},
      });

      await expect(async () =>
        await service.updateEndpoint(first.id, { path: '/second' })
      ).rejects.toThrow('Endpoint with path /second already exists');
    });

    it('should return null for non-existent id', async () => {
      const result = await service.updateEndpoint('non-existent', {
        name: 'Updated',
      });
      expect(result).toBeNull();
    });
  });

  describe('deleteEndpoint', () => {
    it('should delete endpoint by id', async () => {
      const created = await service.createEndpoint({
        name: 'Test',
        path: '/test',
        responseData: {},
      });

      const result = await service.deleteEndpoint(created.id);

      expect(result).toBe(true);
      expect(await service.getEndpointById(created.id)).toBeNull();
    });

    it('should return false for non-existent id', async () => {
      const result = await service.deleteEndpoint('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', async () => {
      await service.createEndpoint({
        name: 'Enabled 1',
        path: '/enabled1',
        responseData: {},
        enabled: true,
      });

      await service.createEndpoint({
        name: 'Enabled 2',
        path: '/enabled2',
        responseData: {},
        enabled: true,
      });

      await service.createEndpoint({
        name: 'Disabled',
        path: '/disabled',
        responseData: {},
        enabled: false,
      });

      const stats = await service.getStats();

      expect(stats.total).toBe(3);
      expect(stats.enabled).toBe(2);
      expect(stats.disabled).toBe(1);
      expect(stats.maxEndpoints).toBe(50);
      expect(stats.remaining).toBe(47);
    });

    it('should return zeros for empty state', async () => {
      const stats = await service.getStats();

      expect(stats.total).toBe(0);
      expect(stats.enabled).toBe(0);
      expect(stats.disabled).toBe(0);
      expect(stats.remaining).toBe(50);
    });
  });
});
