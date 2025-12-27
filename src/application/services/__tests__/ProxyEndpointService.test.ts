import { describe, expect, it, beforeEach } from '@jest/globals';
import { ProxyEndpointService } from '../ProxyEndpointService.js';
import type { ProxyEndpointRepository } from '../../repositories/ProxyEndpointRepository.js';
import type {
  ProxyEndpoint,
  CreateProxyEndpointDto,
} from '../../../domain/ProxyEndpoint.js';

class ProxyEndpointRepositoryMock implements ProxyEndpointRepository {
  private endpoints: Map<string, ProxyEndpoint> = new Map();
  private idCounter = 1;

  async findAll(): Promise<ProxyEndpoint[]> {
    return Array.from(this.endpoints.values());
  }

  async findById(id: string): Promise<ProxyEndpoint | null> {
    return this.endpoints.get(id) || null;
  }

  async findByPath(path: string): Promise<ProxyEndpoint | null> {
    return (
      Array.from(this.endpoints.values()).find((e) => e.path === path) || null
    );
  }

  async save(dto: CreateProxyEndpointDto): Promise<ProxyEndpoint> {
    const id = `proxy-${this.idCounter++}`;
    const now = new Date();
    const endpoint: ProxyEndpoint = {
      id,
      name: dto.name,
      path: dto.path,
      baseUrl: dto.baseUrl,
      groupId: dto.groupId,
      enabled: dto.enabled !== false,
      statusCodeOverride: dto.statusCodeOverride,
      delayMs: dto.delayMs || 0,
      useCache: dto.useCache || false,
      createdAt: now,
      updatedAt: now,
    };
    this.endpoints.set(id, endpoint);
    return endpoint;
  }

  async update(id: string, dto: any): Promise<ProxyEndpoint | null> {
    const existing = this.endpoints.get(id);
    if (!existing) return null;

    const updated: ProxyEndpoint = {
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

describe('ProxyEndpointService', () => {
  let service: ProxyEndpointService;
  let repository: ProxyEndpointRepositoryMock;

  beforeEach(() => {
    repository = new ProxyEndpointRepositoryMock();
    service = new ProxyEndpointService(repository);
  });

  describe('createEndpoint', () => {
    it('should create a new endpoint with valid data', async () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Test Proxy',
        path: '/test',
        baseUrl: 'https://api.example.com',
      };

      const result = await service.createEndpoint(dto);

      expect(result.name).toBe('Test Proxy');
      expect(result.path).toBe('/test');
      expect(result.baseUrl).toBe('https://api.example.com');
      expect(result.enabled).toBe(true);
      expect(result.delayMs).toBe(0);
    });

    it('should normalize path by adding leading slash', async () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Test',
        path: 'test/path',
        baseUrl: 'https://api.example.com',
      };

      const result = await service.createEndpoint(dto);

      expect(result.path).toBe('/test/path');
    });

    it('should throw error when creating duplicate path', async () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Test',
        path: '/duplicate',
        baseUrl: 'https://api.example.com',
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
          baseUrl: 'https://api.example.com',
        });
      }

      // Try to create the 51st
      await expect(async () =>
        await service.createEndpoint({
          name: 'Endpoint 51',
          path: '/endpoint-51',
          baseUrl: 'https://api.example.com',
        })
      ).rejects.toThrow(
        'Cannot create endpoint: maximum limit of 50 endpoints reached'
      );
    });

    it('should throw error for invalid base URL without http/https', async () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Invalid',
        path: '/invalid',
        baseUrl: 'api.example.com',
      };

      await expect(async () => await service.createEndpoint(dto)).rejects.toThrow(
        'Base URL must start with http:// or https://'
      );
    });

    it('should accept http:// base URL', async () => {
      const dto: CreateProxyEndpointDto = {
        name: 'HTTP',
        path: '/http',
        baseUrl: 'http://api.example.com',
      };

      const result = await service.createEndpoint(dto);

      expect(result.baseUrl).toBe('http://api.example.com');
    });

    it('should accept https:// base URL', async () => {
      const dto: CreateProxyEndpointDto = {
        name: 'HTTPS',
        path: '/https',
        baseUrl: 'https://api.example.com',
      };

      const result = await service.createEndpoint(dto);

      expect(result.baseUrl).toBe('https://api.example.com');
    });

    it('should throw error for invalid status code override (too low)', async () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Invalid',
        path: '/invalid',
        baseUrl: 'https://api.example.com',
        statusCodeOverride: 99,
      };

      await expect(async () => await service.createEndpoint(dto)).rejects.toThrow(
        'Status code override must be between 100 and 599'
      );
    });

    it('should throw error for invalid status code override (too high)', async () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Invalid',
        path: '/invalid',
        baseUrl: 'https://api.example.com',
        statusCodeOverride: 600,
      };

      await expect(async () => await service.createEndpoint(dto)).rejects.toThrow(
        'Status code override must be between 100 and 599'
      );
    });

    it('should accept valid status code override', async () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Override',
        path: '/override',
        baseUrl: 'https://api.example.com',
        statusCodeOverride: 500,
      };

      const result = await service.createEndpoint(dto);

      expect(result.statusCodeOverride).toBe(500);
    });

    it('should accept status code override undefined', async () => {
      const dto: CreateProxyEndpointDto = {
        name: 'No Override',
        path: '/no-override',
        baseUrl: 'https://api.example.com',
      };

      const result = await service.createEndpoint(dto);

      expect(result.statusCodeOverride).toBeUndefined();
    });

    it('should throw error for invalid delay (negative)', async () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Invalid',
        path: '/invalid',
        baseUrl: 'https://api.example.com',
        delayMs: -1,
      };

      await expect(async () => await service.createEndpoint(dto)).rejects.toThrow(
        'Delay must be between 0 and 10000ms'
      );
    });

    it('should throw error for invalid delay (too high)', async () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Invalid',
        path: '/invalid',
        baseUrl: 'https://api.example.com',
        delayMs: 10001,
      };

      await expect(async () => await service.createEndpoint(dto)).rejects.toThrow(
        'Delay must be between 0 and 10000ms'
      );
    });

    it('should accept valid delay', async () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Delayed',
        path: '/delayed',
        baseUrl: 'https://api.example.com',
        delayMs: 5000,
      };

      const result = await service.createEndpoint(dto);

      expect(result.delayMs).toBe(5000);
    });

    it('should accept group ID', async () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Grouped',
        path: '/grouped',
        baseUrl: 'https://api.example.com',
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
        baseUrl: 'https://api.example.com',
      });
      await service.createEndpoint({
        name: 'Second',
        path: '/second',
        baseUrl: 'https://api.example.com',
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
        baseUrl: 'https://api.example.com',
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
        baseUrl: 'https://api.example.com',
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
        baseUrl: 'https://api.example.com',
      });

      const updated = await service.updateEndpoint(created.id, {
        name: 'Updated',
        baseUrl: 'https://api2.example.com',
        delayMs: 1000,
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated');
      expect(updated?.baseUrl).toBe('https://api2.example.com');
      expect(updated?.delayMs).toBe(1000);
      expect(updated?.path).toBe('/original'); // Unchanged
    });

    it('should normalize path when updating', async () => {
      const created = await service.createEndpoint({
        name: 'Test',
        path: '/test',
        baseUrl: 'https://api.example.com',
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
        baseUrl: 'https://api.example.com',
      });

      await service.createEndpoint({
        name: 'Second',
        path: '/second',
        baseUrl: 'https://api.example.com',
      });

      await expect(async () =>
        await service.updateEndpoint(first.id, { path: '/second' })
      ).rejects.toThrow('Endpoint with path /second already exists');
    });

    it('should throw error when updating to invalid base URL', async () => {
      const created = await service.createEndpoint({
        name: 'Test',
        path: '/test',
        baseUrl: 'https://api.example.com',
      });

      await expect(async () =>
        await service.updateEndpoint(created.id, { baseUrl: 'invalid-url' })
      ).rejects.toThrow('Base URL must start with http:// or https://');
    });

    it('should throw error when updating to invalid status code', async () => {
      const created = await service.createEndpoint({
        name: 'Test',
        path: '/test',
        baseUrl: 'https://api.example.com',
      });

      await expect(async () =>
        await service.updateEndpoint(created.id, { statusCodeOverride: 999 })
      ).rejects.toThrow('Status code override must be between 100 and 599');
    });

    it('should throw error when updating to invalid delay', async () => {
      const created = await service.createEndpoint({
        name: 'Test',
        path: '/test',
        baseUrl: 'https://api.example.com',
      });

      await expect(async () =>
        await service.updateEndpoint(created.id, { delayMs: 20000 })
      ).rejects.toThrow('Delay must be between 0 and 10000ms');
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
        baseUrl: 'https://api.example.com',
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
        baseUrl: 'https://api.example.com',
        enabled: true,
      });

      await service.createEndpoint({
        name: 'Enabled 2',
        path: '/enabled2',
        baseUrl: 'https://api.example.com',
        enabled: true,
      });

      await service.createEndpoint({
        name: 'Disabled',
        path: '/disabled',
        baseUrl: 'https://api.example.com',
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
