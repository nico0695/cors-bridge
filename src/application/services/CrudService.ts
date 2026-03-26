import { randomUUID } from 'node:crypto';
import type { CrudTableRepository } from '../repositories/CrudTableRepository.js';
import type { CrudEntryRepository } from '../repositories/CrudEntryRepository.js';
import type {
  CrudTable,
  CreateCrudTableDto,
  UpdateCrudTableDto,
  CrudFieldDefinition,
  CrudFieldType,
} from '../../domain/CrudTable.js';
import type {
  CrudEntry,
  CrudEntryData,
  CrudEntryView,
} from '../../domain/CrudEntry.js';

const MAX_CRUDS_PER_USER = 5;
const DEFAULT_MAX_ENTRIES = 15;
const MAX_ENTRIES_CEILING = 1000;
const MAX_SCHEMA_FIELDS = 20;
const BASE_PATH_PATTERN = /^[a-z0-9][a-z0-9\-_]*$/;
const RESERVED_FIELD_NAMES = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'created_at',
  'updated_at',
]);
const VALID_FIELD_TYPES = new Set<CrudFieldType>([
  'string',
  'number',
  'boolean',
  'date',
]);

export interface CrudStats {
  total: number;
  enabled: number;
  disabled: number;
  maxTables: number | null;
  remaining: number | null;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class DisabledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DisabledError';
  }
}

export class MaxEntriesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MaxEntriesError';
  }
}

export class CrudService {
  constructor(
    private readonly tableRepository: CrudTableRepository,
    private readonly entryRepository: CrudEntryRepository
  ) {}

  async getAllTables(
    requesterId: string,
    requesterRole: string
  ): Promise<CrudTable[]> {
    if (requesterRole === 'admin') {
      return this.tableRepository.findAll();
    }
    return this.tableRepository.findAllByOwner(requesterId);
  }

  async getTableById(
    id: string,
    requesterId: string,
    requesterRole: string
  ): Promise<CrudTable | null> {
    const table = await this.tableRepository.findById(id);
    if (!table) {
      return null;
    }
    if (!this.isOwnerOrAdmin(table, requesterId, requesterRole)) {
      throw new ForbiddenError('Access denied');
    }
    return table;
  }

  async createTable(
    dto: CreateCrudTableDto,
    ownerUserId: string,
    requesterRole: string
  ): Promise<CrudTable> {
    if (requesterRole !== 'admin') {
      const count = await this.tableRepository.countByOwner(ownerUserId);
      if (count >= MAX_CRUDS_PER_USER) {
        throw new ValidationError(
          `Cannot create table: maximum limit of ${MAX_CRUDS_PER_USER} tables per user reached`
        );
      }
    }

    const basePath = this.normalizeBasePath(dto.basePath);
    this.validateBasePathFormat(basePath);

    const existing = await this.tableRepository.findByBasePath(basePath);
    if (existing) {
      throw new ValidationError(
        `A CRUD table with basePath '${basePath}' already exists`
      );
    }

    this.validateSchemaDefinition(dto.schema);

    const maxEntries = dto.maxEntries ?? DEFAULT_MAX_ENTRIES;
    if (maxEntries < 1 || maxEntries > MAX_ENTRIES_CEILING) {
      throw new ValidationError(
        `maxEntries must be between 1 and ${MAX_ENTRIES_CEILING}`
      );
    }

    return this.tableRepository.save(
      { ...dto, basePath, maxEntries },
      ownerUserId
    );
  }

  async updateTable(
    id: string,
    dto: UpdateCrudTableDto,
    requesterId: string,
    requesterRole: string
  ): Promise<CrudTable | null> {
    const table = await this.tableRepository.findById(id);
    if (!table) {
      return null;
    }

    if (!this.isOwnerOrAdmin(table, requesterId, requesterRole)) {
      throw new ForbiddenError('Access denied');
    }

    const patch: UpdateCrudTableDto = {};

    if (dto.name !== undefined) {
      patch.name = dto.name;
    }

    if (dto.basePath !== undefined) {
      const basePath = this.normalizeBasePath(dto.basePath);
      this.validateBasePathFormat(basePath);

      if (basePath !== table.basePath) {
        const existing = await this.tableRepository.findByBasePath(basePath);
        if (existing) {
          throw new ValidationError(
            `A CRUD table with basePath '${basePath}' already exists`
          );
        }
      }

      patch.basePath = basePath;
    }

    if (dto.schema !== undefined) {
      const entryCount = await this.entryRepository.countByCrudTable(id);
      if (entryCount > 0) {
        throw new ValidationError(
          'Cannot update schema while entries exist. Delete all entries first.'
        );
      }
      this.validateSchemaDefinition(dto.schema);
      patch.schema = dto.schema;
    }

    if (dto.maxEntries !== undefined) {
      if (dto.maxEntries < 1 || dto.maxEntries > MAX_ENTRIES_CEILING) {
        throw new ValidationError(
          `maxEntries must be between 1 and ${MAX_ENTRIES_CEILING}`
        );
      }
      patch.maxEntries = dto.maxEntries;
    }

    if (dto.enabled !== undefined) {
      patch.enabled = dto.enabled;
    }

    return this.tableRepository.update(id, patch);
  }

  async deleteTable(
    id: string,
    requesterId: string,
    requesterRole: string
  ): Promise<boolean> {
    const table = await this.tableRepository.findById(id);
    if (!table) {
      return false;
    }

    if (!this.isOwnerOrAdmin(table, requesterId, requesterRole)) {
      throw new ForbiddenError('Access denied');
    }

    await this.entryRepository.deleteAllByCrudTable(id);
    return this.tableRepository.delete(id);
  }

  async getStats(
    requesterId: string,
    requesterRole: string
  ): Promise<CrudStats> {
    const tables =
      requesterRole === 'admin'
        ? await this.tableRepository.findAll()
        : await this.tableRepository.findAllByOwner(requesterId);

    const total = tables.length;
    const enabled = tables.filter((t) => t.enabled).length;
    const disabled = total - enabled;

    if (requesterRole === 'admin') {
      return { total, enabled, disabled, maxTables: null, remaining: null };
    }

    return {
      total,
      enabled,
      disabled,
      maxTables: MAX_CRUDS_PER_USER,
      remaining: MAX_CRUDS_PER_USER - total,
    };
  }

  async listEntries(basePath: string): Promise<CrudEntryView[]> {
    const table = await this.tableRepository.findByBasePath(basePath);
    if (!table) {
      throw new NotFoundError(`CRUD table '${basePath}' not found`);
    }

    const entries = await this.entryRepository.findAllByCrudTable(table.id);
    return entries.map((e) => this.toEntryView(e));
  }

  async getEntry(
    basePath: string,
    entryId: string
  ): Promise<CrudEntryView | null> {
    const table = await this.tableRepository.findByBasePath(basePath);
    if (!table) {
      throw new NotFoundError(`CRUD table '${basePath}' not found`);
    }

    const entry = await this.entryRepository.findByEntryId(table.id, entryId);
    return entry ? this.toEntryView(entry) : null;
  }

  async createEntry(
    basePath: string,
    rawData: unknown
  ): Promise<CrudEntryView> {
    const table = await this.tableRepository.findByBasePath(basePath);
    if (!table) {
      throw new NotFoundError(`CRUD table '${basePath}' not found`);
    }

    if (!table.enabled) {
      throw new DisabledError(`CRUD table '${basePath}' is disabled`);
    }

    const count = await this.entryRepository.countByCrudTable(table.id);
    if (count >= table.maxEntries) {
      throw new MaxEntriesError(
        `CRUD table '${basePath}' has reached its maximum of ${table.maxEntries} entries`
      );
    }

    const data = this.validateAndStripEntryData(rawData, table.schema, false);
    const entryId = randomUUID();
    const entry = await this.entryRepository.save(table.id, entryId, data);
    return this.toEntryView(entry);
  }

  async updateEntry(
    basePath: string,
    entryId: string,
    rawData: unknown,
    isPatch: boolean
  ): Promise<CrudEntryView | null> {
    const table = await this.tableRepository.findByBasePath(basePath);
    if (!table) {
      throw new NotFoundError(`CRUD table '${basePath}' not found`);
    }

    if (!table.enabled) {
      throw new DisabledError(`CRUD table '${basePath}' is disabled`);
    }

    const existing = await this.entryRepository.findByEntryId(
      table.id,
      entryId
    );
    if (!existing) {
      return null;
    }

    const validated = this.validateAndStripEntryData(
      rawData,
      table.schema,
      isPatch
    );

    const mergedData: CrudEntryData = isPatch
      ? { ...existing.data, ...validated }
      : validated;

    const updated = await this.entryRepository.update(
      table.id,
      entryId,
      mergedData
    );
    return updated ? this.toEntryView(updated) : null;
  }

  async deleteEntry(basePath: string, entryId: string): Promise<boolean> {
    const table = await this.tableRepository.findByBasePath(basePath);
    if (!table) {
      throw new NotFoundError(`CRUD table '${basePath}' not found`);
    }

    return this.entryRepository.deleteByEntryId(table.id, entryId);
  }

  private normalizeBasePath(raw: string): string {
    return raw.toLowerCase().replace(/^\/+|\/+$/g, '');
  }

  private validateBasePathFormat(basePath: string): void {
    if (!basePath) {
      throw new ValidationError('basePath cannot be empty');
    }
    if (!BASE_PATH_PATTERN.test(basePath)) {
      throw new ValidationError(
        `basePath '${basePath}' is invalid. Use lowercase letters, numbers, hyphens, and underscores only. Must start with a letter or number.`
      );
    }
  }

  private validateSchemaDefinition(schema: CrudFieldDefinition[]): void {
    if (!Array.isArray(schema) || schema.length === 0) {
      throw new ValidationError('Schema must have at least one field');
    }

    if (schema.length > MAX_SCHEMA_FIELDS) {
      throw new ValidationError(
        `Schema cannot have more than ${MAX_SCHEMA_FIELDS} fields`
      );
    }

    const names = new Set<string>();
    for (const field of schema) {
      if (!field.name || typeof field.name !== 'string') {
        throw new ValidationError('Each schema field must have a name');
      }

      if (RESERVED_FIELD_NAMES.has(field.name)) {
        throw new ValidationError(
          `Field name '${field.name}' is reserved and cannot be used`
        );
      }

      if (names.has(field.name)) {
        throw new ValidationError(
          `Duplicate field name '${field.name}' in schema`
        );
      }
      names.add(field.name);

      if (!VALID_FIELD_TYPES.has(field.type as CrudFieldType)) {
        throw new ValidationError(
          `Invalid field type '${field.type}'. Valid types: string, number, boolean, date`
        );
      }
    }
  }

  private validateAndStripEntryData(
    rawData: unknown,
    schema: CrudFieldDefinition[],
    isPatch: boolean
  ): CrudEntryData {
    if (
      typeof rawData !== 'object' ||
      rawData === null ||
      Array.isArray(rawData)
    ) {
      throw new ValidationError('Entry data must be a plain object');
    }

    const input = rawData as Record<string, unknown>;
    const result: CrudEntryData = {};

    for (const field of schema) {
      const value = input[field.name];

      if (value === undefined || value === null) {
        if (field.required && !isPatch) {
          throw new ValidationError(
            `Required field '${field.name}' is missing`
          );
        }
        if (value === null) {
          result[field.name] = null;
        }
        continue;
      }

      switch (field.type) {
        case 'string':
          if (typeof value !== 'string') {
            throw new ValidationError(`Field '${field.name}' must be a string`);
          }
          result[field.name] = value;
          break;

        case 'number':
          if (typeof value !== 'number') {
            throw new ValidationError(`Field '${field.name}' must be a number`);
          }
          result[field.name] = value;
          break;

        case 'boolean':
          if (typeof value !== 'boolean') {
            throw new ValidationError(
              `Field '${field.name}' must be a boolean`
            );
          }
          result[field.name] = value;
          break;

        case 'date':
          if (typeof value !== 'string') {
            throw new ValidationError(
              `Field '${field.name}' must be an ISO 8601 date string`
            );
          }
          if (new Date(value).toString() === 'Invalid Date') {
            throw new ValidationError(
              `Field '${field.name}' is not a valid date string`
            );
          }
          result[field.name] = value;
          break;
      }
    }

    return result;
  }

  private isOwnerOrAdmin(
    table: CrudTable,
    requesterId: string,
    requesterRole: string
  ): boolean {
    return requesterRole === 'admin' || table.ownerUserId === requesterId;
  }

  private toEntryView(entry: CrudEntry): CrudEntryView {
    return {
      id: entry.entryId,
      ...entry.data,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
