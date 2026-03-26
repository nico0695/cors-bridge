import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import type { CrudEntryRepository } from '../../application/repositories/CrudEntryRepository.js';
import type { CrudEntry, CrudEntryData } from '../../domain/CrudEntry.js';
import type { Logger } from 'pino';
import { getDataSource } from '../database/connection.js';
import { CrudEntryEntity } from '../database/entities/CrudEntryEntity.js';

export class TypeOrmCrudEntryRepository implements CrudEntryRepository {
  private repository: Repository<CrudEntryEntity>;

  constructor(private readonly logger: Logger) {
    this.repository = getDataSource().getRepository(CrudEntryEntity);
  }

  private entityToModel(entity: CrudEntryEntity): CrudEntry {
    return {
      id: entity.id,
      crudTableId: entity.crudTableId,
      entryId: entity.entryId,
      data: entity.data,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async findAllByCrudTable(crudTableId: string): Promise<CrudEntry[]> {
    const entities = await this.repository.find({
      where: { crudTableId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.entityToModel(e));
  }

  async findByEntryId(
    crudTableId: string,
    entryId: string
  ): Promise<CrudEntry | null> {
    const entity = await this.repository.findOneBy({ crudTableId, entryId });
    return entity ? this.entityToModel(entity) : null;
  }

  async countByCrudTable(crudTableId: string): Promise<number> {
    return this.repository.count({ where: { crudTableId } });
  }

  async save(
    crudTableId: string,
    entryId: string,
    data: CrudEntryData
  ): Promise<CrudEntry> {
    const id = randomUUID();
    const now = new Date();

    const entity = this.repository.create({
      id,
      crudTableId,
      entryId,
      data,
      createdAt: now,
      updatedAt: now,
    });

    await this.repository.save(entity);
    this.logger.info({ id, crudTableId, entryId }, 'CRUD entry created');

    return this.entityToModel(entity);
  }

  async update(
    crudTableId: string,
    entryId: string,
    data: CrudEntryData
  ): Promise<CrudEntry | null> {
    const existing = await this.findByEntryId(crudTableId, entryId);
    if (!existing) {
      return null;
    }

    await this.repository.update(
      { crudTableId, entryId },
      { data, updatedAt: new Date() }
    );
    this.logger.info({ crudTableId, entryId }, 'CRUD entry updated');

    return this.findByEntryId(crudTableId, entryId);
  }

  async deleteByEntryId(
    crudTableId: string,
    entryId: string
  ): Promise<boolean> {
    const result = await this.repository.delete({ crudTableId, entryId });
    const deleted = (result.affected ?? 0) > 0;
    if (deleted) {
      this.logger.info({ crudTableId, entryId }, 'CRUD entry deleted');
    }
    return deleted;
  }

  async deleteAllByCrudTable(crudTableId: string): Promise<void> {
    await this.repository.delete({ crudTableId });
    this.logger.info({ crudTableId }, 'All CRUD entries deleted for table');
  }
}
