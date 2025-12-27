import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import type { ProxyEndpointRepository } from '../../application/repositories/ProxyEndpointRepository.js';
import type {
  ProxyEndpoint,
  CreateProxyEndpointDto,
  UpdateProxyEndpointDto,
} from '../../domain/ProxyEndpoint.js';
import type { Logger } from 'pino';
import { getDataSource } from '../database/connection.js';
import { ProxyEndpointEntity } from '../database/entities/ProxyEndpointEntity.js';

export class TypeOrmProxyEndpointRepository implements ProxyEndpointRepository {
  private repository: Repository<ProxyEndpointEntity>;

  constructor(private readonly logger: Logger) {
    this.repository = getDataSource().getRepository(ProxyEndpointEntity);
  }

  private entityToProxyEndpoint(entity: ProxyEndpointEntity): ProxyEndpoint {
    return {
      id: entity.id,
      name: entity.name,
      path: entity.path,
      baseUrl: entity.baseUrl,
      groupId: entity.groupId,
      enabled: entity.enabled,
      statusCodeOverride: entity.statusCodeOverride,
      delayMs: entity.delayMs,
      useCache: entity.useCache,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async findAll(): Promise<ProxyEndpoint[]> {
    const entities = await this.repository.find({
      order: { createdAt: 'DESC' },
    });
    return entities.map(this.entityToProxyEndpoint);
  }

  async findById(id: string): Promise<ProxyEndpoint | null> {
    const entity = await this.repository.findOneBy({ id });
    return entity ? this.entityToProxyEndpoint(entity) : null;
  }

  async findByPath(path: string): Promise<ProxyEndpoint | null> {
    const entity = await this.repository.findOneBy({ path });
    return entity ? this.entityToProxyEndpoint(entity) : null;
  }

  async save(dto: CreateProxyEndpointDto): Promise<ProxyEndpoint> {
    const id = randomUUID();
    const now = new Date();

    const entity = this.repository.create({
      id,
      name: dto.name,
      path: dto.path,
      baseUrl: dto.baseUrl,
      groupId: dto.groupId,
      enabled: dto.enabled !== false,
      statusCodeOverride: dto.statusCodeOverride,
      delayMs: dto.delayMs || 0,
      useCache: dto.useCache === true,
      createdAt: now,
      updatedAt: now,
    });

    await this.repository.save(entity);
    this.logger.info({ id, path: dto.path }, 'Proxy endpoint created');

    return this.entityToProxyEndpoint(entity);
  }

  async update(
    id: string,
    dto: UpdateProxyEndpointDto
  ): Promise<ProxyEndpoint | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const updateData: Partial<ProxyEndpointEntity> = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.path !== undefined) updateData.path = dto.path;
    if (dto.baseUrl !== undefined) updateData.baseUrl = dto.baseUrl;
    if (dto.groupId !== undefined) updateData.groupId = dto.groupId;
    if (dto.enabled !== undefined) updateData.enabled = dto.enabled;
    if (dto.statusCodeOverride !== undefined)
      updateData.statusCodeOverride = dto.statusCodeOverride;
    if (dto.delayMs !== undefined) updateData.delayMs = dto.delayMs;
    if (dto.useCache !== undefined) updateData.useCache = dto.useCache;

    await this.repository.update({ id }, updateData);
    this.logger.info({ id }, 'Proxy endpoint updated');

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id });
    const deleted = (result.affected ?? 0) > 0;
    if (deleted) {
      this.logger.info({ id }, 'Proxy endpoint deleted');
    }
    return deleted;
  }

  async count(): Promise<number> {
    return this.repository.count();
  }

  close(): void {
    // TypeORM DataSource manages connections
  }
}
