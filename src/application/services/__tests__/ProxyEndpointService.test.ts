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

  findAll(): ProxyEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  findById(id: string): ProxyEndpoint | null {
    return this.endpoints.get(id) || null;
  }

  findByPath(path: string): ProxyEndpoint | null {
    return (
      Array.from(this.endpoints.values()).find((e) => e.path === path) || null
    );
  }

  save(dto: CreateProxyEndpointDto): ProxyEndpoint {
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
      createdAt: now,
      updatedAt: now,
    };
    this.endpoints.set(id, endpoint);
    return endpoint;
  }

  update(id: string, dto: any): ProxyEndpoint | null {
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

describe('ProxyEndpointService', () => {
  let service: ProxyEndpointService;
  let repository: ProxyEndpointRepositoryMock;

  beforeEach(() => {
    repository = new ProxyEndpointRepositoryMock();
    service = new ProxyEndpointService(repository);
  });

  describe('createEndpoint', () => {
    it('should create a new endpoint with valid data', () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Test Proxy',
        path: '/test',
        baseUrl: 'https://api.example.com',
      };

      const result = service.createEndpoint(dto);

      expect(result.name).toBe('Test Proxy');
      expect(result.path).toBe('/test');
      expect(result.baseUrl).toBe('https://api.example.com');
      expect(result.enabled).toBe(true);
      expect(result.delayMs).toBe(0);
    });

    it('should normalize path by adding leading slash', () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Test',
        path: 'test/path',
        baseUrl: 'https://api.example.com',
      };

      const result = service.createEndpoint(dto);

      expect(result.path).toBe('/test/path');
    });

    it('should throw error when creating duplicate path', () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Test',
        path: '/duplicate',
        baseUrl: 'https://api.example.com',
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
          baseUrl: 'https://api.example.com',
        });
      }

      // Try to create the 51st
      expect(() =>
        service.createEndpoint({
          name: 'Endpoint 51',
          path: '/endpoint-51',
          baseUrl: 'https://api.example.com',
        })
      ).toThrow(
        'Cannot create endpoint: maximum limit of 50 endpoints reached'
      );
    });

    it('should throw error for invalid base URL without http/https', () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Invalid',
        path: '/invalid',
        baseUrl: 'api.example.com',
      };

      expect(() => service.createEndpoint(dto)).toThrow(
        'Base URL must start with http:// or https://'
      );
    });

    it('should accept http:// base URL', () => {
      const dto: CreateProxyEndpointDto = {
        name: 'HTTP',
        path: '/http',
        baseUrl: 'http://api.example.com',
      };

      const result = service.createEndpoint(dto);

      expect(result.baseUrl).toBe('http://api.example.com');
    });

    it('should accept https:// base URL', () => {
      const dto: CreateProxyEndpointDto = {
        name: 'HTTPS',
        path: '/https',
        baseUrl: 'https://api.example.com',
      };

      const result = service.createEndpoint(dto);

      expect(result.baseUrl).toBe('https://api.example.com');
    });

    it('should throw error for invalid status code override (too low)', () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Invalid',
        path: '/invalid',
        baseUrl: 'https://api.example.com',
        statusCodeOverride: 99,
      };

      expect(() => service.createEndpoint(dto)).toThrow(
        'Status code override must be between 100 and 599'
      );
    });

    it('should throw error for invalid status code override (too high)', () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Invalid',
        path: '/invalid',
        baseUrl: 'https://api.example.com',
        statusCodeOverride: 600,
      };

      expect(() => service.createEndpoint(dto)).toThrow(
        'Status code override must be between 100 and 599'
      );
    });

    it('should accept valid status code override', () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Override',
        path: '/override',
        baseUrl: 'https://api.example.com',
        statusCodeOverride: 500,
      };

      const result = service.createEndpoint(dto);

      expect(result.statusCodeOverride).toBe(500);
    });

    it('should accept status code override undefined', () => {
      const dto: CreateProxyEndpointDto = {
        name: 'No Override',
        path: '/no-override',
        baseUrl: 'https://api.example.com',
      };

      const result = service.createEndpoint(dto);

      expect(result.statusCodeOverride).toBeUndefined();
    });

    it('should throw error for invalid delay (negative)', () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Invalid',
        path: '/invalid',
        baseUrl: 'https://api.example.com',
        delayMs: -1,
      };

      expect(() => service.createEndpoint(dto)).toThrow(
        'Delay must be between 0 and 10000ms'
      );
    });

    it('should throw error for invalid delay (too high)', () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Invalid',
        path: '/invalid',
        baseUrl: 'https://api.example.com',
        delayMs: 10001,
      };

      expect(() => service.createEndpoint(dto)).toThrow(
        'Delay must be between 0 and 10000ms'
      );
    });

    it('should accept valid delay', () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Delayed',
        path: '/delayed',
        baseUrl: 'https://api.example.com',
        delayMs: 5000,
      };

      const result = service.createEndpoint(dto);

      expect(result.delayMs).toBe(5000);
    });

    it('should accept group ID', () => {
      const dto: CreateProxyEndpointDto = {
        name: 'Grouped',
        path: '/grouped',
        baseUrl: 'https://api.example.com',
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
        baseUrl: 'https://api.example.com',
      });
      service.createEndpoint({
        name: 'Second',
        path: '/second',
        baseUrl: 'https://api.example.com',
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
        baseUrl: 'https://api.example.com',
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
        baseUrl: 'https://api.example.com',
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
        baseUrl: 'https://api.example.com',
      });

      const updated = service.updateEndpoint(created.id, {
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

    it('should normalize path when updating', () => {
      const created = service.createEndpoint({
        name: 'Test',
        path: '/test',
        baseUrl: 'https://api.example.com',
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
        baseUrl: 'https://api.example.com',
      });

      service.createEndpoint({
        name: 'Second',
        path: '/second',
        baseUrl: 'https://api.example.com',
      });

      expect(() =>
        service.updateEndpoint(first.id, { path: '/second' })
      ).toThrow('Endpoint with path /second already exists');
    });

    it('should throw error when updating to invalid base URL', () => {
      const created = service.createEndpoint({
        name: 'Test',
        path: '/test',
        baseUrl: 'https://api.example.com',
      });

      expect(() =>
        service.updateEndpoint(created.id, { baseUrl: 'invalid-url' })
      ).toThrow('Base URL must start with http:// or https://');
    });

    it('should throw error when updating to invalid status code', () => {
      const created = service.createEndpoint({
        name: 'Test',
        path: '/test',
        baseUrl: 'https://api.example.com',
      });

      expect(() =>
        service.updateEndpoint(created.id, { statusCodeOverride: 999 })
      ).toThrow('Status code override must be between 100 and 599');
    });

    it('should throw error when updating to invalid delay', () => {
      const created = service.createEndpoint({
        name: 'Test',
        path: '/test',
        baseUrl: 'https://api.example.com',
      });

      expect(() =>
        service.updateEndpoint(created.id, { delayMs: 20000 })
      ).toThrow('Delay must be between 0 and 10000ms');
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
        baseUrl: 'https://api.example.com',
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
        baseUrl: 'https://api.example.com',
        enabled: true,
      });

      service.createEndpoint({
        name: 'Enabled 2',
        path: '/enabled2',
        baseUrl: 'https://api.example.com',
        enabled: true,
      });

      service.createEndpoint({
        name: 'Disabled',
        path: '/disabled',
        baseUrl: 'https://api.example.com',
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
