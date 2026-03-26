import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import type { CrudTableRepository } from '../../application/repositories/CrudTableRepository.js';
import type {
  CrudTable,
  CreateCrudTableDto,
  UpdateCrudTableDto,
} from '../../domain/CrudTable.js';
import type { Logger } from 'pino';
import { getDataSource } from '../database/connection.js';
import { CrudTableEntity } from '../database/entities/CrudTableEntity.js';

export class TypeOrmCrudTableRepository implements CrudTableRepository {
  private repository: Repository<CrudTableEntity>;

  constructor(private readonly logger: Logger) {
    this.repository = getDataSource().getRepository(CrudTableEntity);
  }

  private entityToModel(entity: CrudTableEntity): CrudTable {
    return {
      id: entity.id,
      name: entity.name,
      basePath: entity.basePath,
      schema: entity.schema,
      maxEntries: entity.maxEntries,
      ownerUserId: entity.ownerUserId,
      enabled: entity.enabled,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async findAll(): Promise<CrudTable[]> {
    const entities = await this.repository.find({
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.entityToModel(e));
  }

  async findAllByOwner(ownerUserId: string): Promise<CrudTable[]> {
    const entities = await this.repository.find({
      where: { ownerUserId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.entityToModel(e));
  }

  async findById(id: string): Promise<CrudTable | null> {
    const entity = await this.repository.findOneBy({ id });
    return entity ? this.entityToModel(entity) : null;
  }

  async findByBasePath(basePath: string): Promise<CrudTable | null> {
    const entity = await this.repository.findOneBy({ basePath });
    return entity ? this.entityToModel(entity) : null;
  }

  async countByOwner(ownerUserId: string): Promise<number> {
    return this.repository.count({ where: { ownerUserId } });
  }

  async save(dto: CreateCrudTableDto, ownerUserId: string): Promise<CrudTable> {
    const id = randomUUID();
    const now = new Date();

    const entity = this.repository.create({
      id,
      name: dto.name,
      basePath: dto.basePath,
      schema: dto.schema,
      maxEntries: dto.maxEntries ?? 15,
      ownerUserId,
      enabled: dto.enabled !== false,
      createdAt: now,
      updatedAt: now,
    });

    await this.repository.save(entity);
    this.logger.info({ id, basePath: dto.basePath }, 'CRUD table created');

    return this.entityToModel(entity);
  }

  async update(id: string, dto: UpdateCrudTableDto): Promise<CrudTable | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.basePath !== undefined) updateData.basePath = dto.basePath;
    if (dto.schema !== undefined) updateData.schema = dto.schema;
    if (dto.maxEntries !== undefined) updateData.maxEntries = dto.maxEntries;
    if (dto.enabled !== undefined) updateData.enabled = dto.enabled;

    await this.repository.update({ id }, updateData);
    this.logger.info({ id }, 'CRUD table updated');

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id });
    const deleted = (result.affected ?? 0) > 0;
    if (deleted) {
      this.logger.info({ id }, 'CRUD table deleted');
    }
    return deleted;
  }
}
