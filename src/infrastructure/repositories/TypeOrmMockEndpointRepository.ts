import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import type { MockEndpointRepository } from '../../application/repositories/MockEndpointRepository.js';
import type {
  MockEndpoint,
  CreateMockEndpointDto,
  UpdateMockEndpointDto,
} from '../../domain/MockEndpoint.js';
import type { Logger } from 'pino';
import { getDataSource } from '../database/connection.js';
import { MockEndpointEntity } from '../database/entities/MockEndpointEntity.js';

export class TypeOrmMockEndpointRepository implements MockEndpointRepository {
  private repository: Repository<MockEndpointEntity>;

  constructor(private readonly logger: Logger) {
    this.repository = getDataSource().getRepository(MockEndpointEntity);
  }

  private entityToMockEndpoint(entity: MockEndpointEntity): MockEndpoint {
    return {
      id: entity.id,
      name: entity.name,
      path: entity.path,
      groupId: entity.groupId,
      responseData: entity.responseData,
      contentType: entity.contentType,
      statusCode: entity.statusCode,
      enabled: entity.enabled,
      delayMs: entity.delayMs,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async findAll(): Promise<MockEndpoint[]> {
    const entities = await this.repository.find({
      order: { createdAt: 'DESC' },
    });
    return entities.map(this.entityToMockEndpoint);
  }

  async findById(id: string): Promise<MockEndpoint | null> {
    const entity = await this.repository.findOneBy({ id });
    return entity ? this.entityToMockEndpoint(entity) : null;
  }

  async findByPath(path: string): Promise<MockEndpoint | null> {
    const entity = await this.repository.findOneBy({ path });
    return entity ? this.entityToMockEndpoint(entity) : null;
  }

  async save(dto: CreateMockEndpointDto): Promise<MockEndpoint> {
    const id = randomUUID();
    const now = new Date();

    const entity = this.repository.create({
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
    });

    await this.repository.save(entity);
    this.logger.info({ id, path: dto.path }, 'Mock endpoint created');

    return this.entityToMockEndpoint(entity);
  }

  async update(
    id: string,
    dto: UpdateMockEndpointDto
  ): Promise<MockEndpoint | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.path !== undefined) updateData.path = dto.path;
    if (dto.groupId !== undefined) updateData.groupId = dto.groupId;
    if (dto.responseData !== undefined)
      updateData.responseData = dto.responseData;
    if (dto.contentType !== undefined) updateData.contentType = dto.contentType;
    if (dto.statusCode !== undefined) updateData.statusCode = dto.statusCode;
    if (dto.enabled !== undefined) updateData.enabled = dto.enabled;
    if (dto.delayMs !== undefined) updateData.delayMs = dto.delayMs;

    await this.repository.update({ id }, updateData);
    this.logger.info({ id }, 'Mock endpoint updated');

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id });
    const deleted = (result.affected ?? 0) > 0;
    if (deleted) {
      this.logger.info({ id }, 'Mock endpoint deleted');
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
