import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  CrudService,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  DisabledError,
  MaxEntriesError,
} from '../CrudService.js';
import type { CrudTableRepository } from '../../repositories/CrudTableRepository.js';
import type { CrudEntryRepository } from '../../repositories/CrudEntryRepository.js';
import type {
  CrudTable,
  CreateCrudTableDto,
} from '../../../domain/CrudTable.js';
import type { CrudEntry, CrudEntryData } from '../../../domain/CrudEntry.js';

class CrudTableRepositoryMock implements CrudTableRepository {
  private tables: Map<string, CrudTable> = new Map();
  private idCounter = 1;

  async findAll(): Promise<CrudTable[]> {
    return Array.from(this.tables.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async findAllByOwner(ownerUserId: string): Promise<CrudTable[]> {
    return Array.from(this.tables.values())
      .filter((t) => t.ownerUserId === ownerUserId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findById(id: string): Promise<CrudTable | null> {
    return this.tables.get(id) ?? null;
  }

  async findByBasePath(basePath: string): Promise<CrudTable | null> {
    return (
      Array.from(this.tables.values()).find((t) => t.basePath === basePath) ??
      null
    );
  }

  async countByOwner(ownerUserId: string): Promise<number> {
    return Array.from(this.tables.values()).filter(
      (t) => t.ownerUserId === ownerUserId
    ).length;
  }

  async save(dto: CreateCrudTableDto, ownerUserId: string): Promise<CrudTable> {
    const id = `table-${this.idCounter++}`;
    const now = new Date();
    const table: CrudTable = {
      id,
      name: dto.name,
      basePath: dto.basePath,
      schema: dto.schema,
      maxEntries: dto.maxEntries ?? 15,
      ownerUserId,
      enabled: dto.enabled !== false,
      createdAt: now,
      updatedAt: now,
    };
    this.tables.set(id, table);
    return table;
  }

  async update(id: string, dto: Partial<CrudTable>): Promise<CrudTable | null> {
    const existing = this.tables.get(id);
    if (!existing) return null;
    const updated: CrudTable = { ...existing, ...dto, updatedAt: new Date() };
    this.tables.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.tables.delete(id);
  }
}

class CrudEntryRepositoryMock implements CrudEntryRepository {
  private entries: Map<string, CrudEntry> = new Map();
  private idCounter = 1;

  private key(crudTableId: string, entryId: string): string {
    return `${crudTableId}::${entryId}`;
  }

  async findAllByCrudTable(crudTableId: string): Promise<CrudEntry[]> {
    return Array.from(this.entries.values())
      .filter((e) => e.crudTableId === crudTableId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByEntryId(
    crudTableId: string,
    entryId: string
  ): Promise<CrudEntry | null> {
    return this.entries.get(this.key(crudTableId, entryId)) ?? null;
  }

  async countByCrudTable(crudTableId: string): Promise<number> {
    return Array.from(this.entries.values()).filter(
      (e) => e.crudTableId === crudTableId
    ).length;
  }

  async save(
    crudTableId: string,
    entryId: string,
    data: CrudEntryData
  ): Promise<CrudEntry> {
    const id = `entry-${this.idCounter++}`;
    const now = new Date();
    const entry: CrudEntry = {
      id,
      crudTableId,
      entryId,
      data,
      createdAt: now,
      updatedAt: now,
    };
    this.entries.set(this.key(crudTableId, entryId), entry);
    return entry;
  }

  async update(
    crudTableId: string,
    entryId: string,
    data: CrudEntryData
  ): Promise<CrudEntry | null> {
    const k = this.key(crudTableId, entryId);
    const existing = this.entries.get(k);
    if (!existing) return null;
    const updated: CrudEntry = { ...existing, data, updatedAt: new Date() };
    this.entries.set(k, updated);
    return updated;
  }

  async deleteByEntryId(
    crudTableId: string,
    entryId: string
  ): Promise<boolean> {
    return this.entries.delete(this.key(crudTableId, entryId));
  }

  async deleteAllByCrudTable(crudTableId: string): Promise<void> {
    for (const [k, e] of this.entries) {
      if (e.crudTableId === crudTableId) {
        this.entries.delete(k);
      }
    }
  }
}

const baseSchema = [
  { name: 'title', type: 'string' as const, required: true },
  { name: 'price', type: 'number' as const, required: true },
  { name: 'active', type: 'boolean' as const, required: false },
];

describe('CrudService', () => {
  let service: CrudService;
  let tableRepo: CrudTableRepositoryMock;
  let entryRepo: CrudEntryRepositoryMock;

  beforeEach(() => {
    tableRepo = new CrudTableRepositoryMock();
    entryRepo = new CrudEntryRepositoryMock();
    service = new CrudService(tableRepo, entryRepo);
  });

  // ── Table Management ────────────────────────────────────────────────────────

  describe('createTable', () => {
    it('creates with valid data and defaults', async () => {
      const table = await service.createTable(
        { name: 'Products', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
      expect(table.name).toBe('Products');
      expect(table.basePath).toBe('products');
      expect(table.maxEntries).toBe(15);
      expect(table.enabled).toBe(true);
      expect(table.ownerUserId).toBe('user-1');
    });

    it('normalizes basePath to lowercase and strips slashes', async () => {
      const table = await service.createTable(
        { name: 'T', basePath: '/My-Table/', schema: baseSchema },
        'user-1',
        'user'
      );
      expect(table.basePath).toBe('my-table');
    });

    it('throws when user reaches MAX_CRUDS_PER_USER (5)', async () => {
      for (let i = 0; i < 5; i++) {
        await service.createTable(
          { name: `T${i}`, basePath: `table-${i}`, schema: baseSchema },
          'user-1',
          'user'
        );
      }
      await expect(
        service.createTable(
          { name: 'T6', basePath: 'table-6', schema: baseSchema },
          'user-1',
          'user'
        )
      ).rejects.toThrow(ValidationError);
    });

    it('admin is NOT subject to the table limit', async () => {
      for (let i = 0; i < 6; i++) {
        await service.createTable(
          { name: `T${i}`, basePath: `table-${i}`, schema: baseSchema },
          'admin-1',
          'admin'
        );
      }
      const tables = await service.getAllTables('admin-1', 'admin');
      expect(tables.length).toBe(6);
    });

    it('throws on duplicate basePath', async () => {
      await service.createTable(
        { name: 'T', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
      await expect(
        service.createTable(
          { name: 'T2', basePath: 'products', schema: baseSchema },
          'user-2',
          'user'
        )
      ).rejects.toThrow(ValidationError);
    });

    it('throws on invalid basePath format (spaces)', async () => {
      await expect(
        service.createTable(
          { name: 'T', basePath: 'my table', schema: baseSchema },
          'user-1',
          'user'
        )
      ).rejects.toThrow(ValidationError);
    });

    it('throws on empty basePath', async () => {
      await expect(
        service.createTable(
          { name: 'T', basePath: '', schema: baseSchema },
          'user-1',
          'user'
        )
      ).rejects.toThrow(ValidationError);
    });

    it('throws on empty schema', async () => {
      await expect(
        service.createTable(
          { name: 'T', basePath: 'products', schema: [] },
          'user-1',
          'user'
        )
      ).rejects.toThrow(ValidationError);
    });

    it('throws when schema exceeds MAX_SCHEMA_FIELDS (20)', async () => {
      const bigSchema = Array.from({ length: 21 }, (_, i) => ({
        name: `field${i}`,
        type: 'string' as const,
        required: false,
      }));
      await expect(
        service.createTable(
          { name: 'T', basePath: 'products', schema: bigSchema },
          'user-1',
          'user'
        )
      ).rejects.toThrow(ValidationError);
    });

    it('throws on reserved field name in schema', async () => {
      await expect(
        service.createTable(
          {
            name: 'T',
            basePath: 'products',
            schema: [{ name: 'id', type: 'string', required: false }],
          },
          'user-1',
          'user'
        )
      ).rejects.toThrow(ValidationError);
    });

    it('throws on duplicate field names in schema', async () => {
      await expect(
        service.createTable(
          {
            name: 'T',
            basePath: 'products',
            schema: [
              { name: 'title', type: 'string', required: true },
              { name: 'title', type: 'number', required: false },
            ],
          },
          'user-1',
          'user'
        )
      ).rejects.toThrow(ValidationError);
    });

    it('throws on invalid field type', async () => {
      await expect(
        service.createTable(
          {
            name: 'T',
            basePath: 'products',
            schema: [{ name: 'x', type: 'object' as never, required: false }],
          },
          'user-1',
          'user'
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateTable', () => {
    it('updates name without affecting entries', async () => {
      const table = await service.createTable(
        { name: 'Old', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
      const updated = await service.updateTable(
        table.id,
        { name: 'New' },
        'user-1',
        'user'
      );
      expect(updated?.name).toBe('New');
      expect(updated?.basePath).toBe('products');
    });

    it('throws when attempting schema change with existing entries', async () => {
      const table = await service.createTable(
        { name: 'T', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
      await service.createEntry('products', { title: 'A', price: 1 });
      await expect(
        service.updateTable(
          table.id,
          { schema: [{ name: 'x', type: 'string', required: false }] },
          'user-1',
          'user'
        )
      ).rejects.toThrow(ValidationError);
    });

    it('allows schema change when table has no entries', async () => {
      const table = await service.createTable(
        { name: 'T', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
      const updated = await service.updateTable(
        table.id,
        { schema: [{ name: 'label', type: 'string', required: true }] },
        'user-1',
        'user'
      );
      expect(updated?.schema).toHaveLength(1);
    });

    it('non-owner user cannot update', async () => {
      const table = await service.createTable(
        { name: 'T', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
      await expect(
        service.updateTable(table.id, { name: 'Hacked' }, 'user-2', 'user')
      ).rejects.toThrow(ForbiddenError);
    });

    it('admin can update any table', async () => {
      const table = await service.createTable(
        { name: 'T', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
      const updated = await service.updateTable(
        table.id,
        { name: 'Admin Updated' },
        'admin-1',
        'admin'
      );
      expect(updated?.name).toBe('Admin Updated');
    });
  });

  describe('deleteTable', () => {
    it('deletes table and all its entries', async () => {
      const table = await service.createTable(
        { name: 'T', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
      await service.createEntry('products', { title: 'A', price: 1 });
      const deleted = await service.deleteTable(table.id, 'user-1', 'user');
      expect(deleted).toBe(true);
      expect(await entryRepo.findAllByCrudTable(table.id)).toHaveLength(0);
    });

    it('non-owner user cannot delete', async () => {
      const table = await service.createTable(
        { name: 'T', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
      await expect(
        service.deleteTable(table.id, 'user-2', 'user')
      ).rejects.toThrow(ForbiddenError);
    });

    it('admin can delete any table', async () => {
      const table = await service.createTable(
        { name: 'T', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
      const deleted = await service.deleteTable(table.id, 'admin-1', 'admin');
      expect(deleted).toBe(true);
    });

    it('returns false for non-existent id', async () => {
      const deleted = await service.deleteTable(
        'nonexistent',
        'user-1',
        'user'
      );
      expect(deleted).toBe(false);
    });
  });

  describe('getAllTables', () => {
    it('user sees only own tables', async () => {
      await service.createTable(
        { name: 'T1', basePath: 'p1', schema: baseSchema },
        'user-1',
        'user'
      );
      await service.createTable(
        { name: 'T2', basePath: 'p2', schema: baseSchema },
        'user-2',
        'user'
      );
      const tables = await service.getAllTables('user-1', 'user');
      expect(tables).toHaveLength(1);
      expect(tables[0].ownerUserId).toBe('user-1');
    });

    it('admin sees all tables', async () => {
      await service.createTable(
        { name: 'T1', basePath: 'p1', schema: baseSchema },
        'user-1',
        'user'
      );
      await service.createTable(
        { name: 'T2', basePath: 'p2', schema: baseSchema },
        'user-2',
        'user'
      );
      const tables = await service.getAllTables('admin-1', 'admin');
      expect(tables).toHaveLength(2);
    });
  });

  describe('getStats', () => {
    it('user stats: correct total/enabled/disabled/remaining', async () => {
      await service.createTable(
        { name: 'T1', basePath: 'p1', schema: baseSchema, enabled: true },
        'user-1',
        'user'
      );
      await service.createTable(
        { name: 'T2', basePath: 'p2', schema: baseSchema, enabled: false },
        'user-1',
        'user'
      );
      const stats = await service.getStats('user-1', 'user');
      expect(stats.total).toBe(2);
      expect(stats.enabled).toBe(1);
      expect(stats.disabled).toBe(1);
      expect(stats.maxTables).toBe(5);
      expect(stats.remaining).toBe(3);
    });

    it('admin stats: maxTables and remaining are null', async () => {
      const stats = await service.getStats('admin-1', 'admin');
      expect(stats.maxTables).toBeNull();
      expect(stats.remaining).toBeNull();
    });
  });

  // ── Entry Operations ────────────────────────────────────────────────────────

  describe('createEntry', () => {
    beforeEach(async () => {
      await service.createTable(
        { name: 'Products', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
    });

    it('creates entry with valid data matching schema', async () => {
      const view = await service.createEntry('products', {
        title: 'Widget',
        price: 9.99,
        active: true,
      });
      expect(view.title).toBe('Widget');
      expect(view.price).toBe(9.99);
      expect(view.active).toBe(true);
      expect(typeof view.id).toBe('string');
    });

    it('auto-generates entryId (UUID)', async () => {
      const v1 = await service.createEntry('products', {
        title: 'A',
        price: 1,
      });
      const v2 = await service.createEntry('products', {
        title: 'B',
        price: 2,
      });
      expect(v1.id).not.toBe(v2.id);
    });

    it('strips fields not in schema', async () => {
      const view = await service.createEntry('products', {
        title: 'X',
        price: 1,
        extra: 'should be stripped',
      });
      expect((view as Record<string, unknown>).extra).toBeUndefined();
    });

    it('throws on disabled table', async () => {
      const table = await tableRepo.findByBasePath('products');
      await tableRepo.update(table!.id, { enabled: false });
      await expect(
        service.createEntry('products', { title: 'X', price: 1 })
      ).rejects.toThrow(DisabledError);
    });

    it('throws on non-existent basePath', async () => {
      await expect(
        service.createEntry('nonexistent', { title: 'X', price: 1 })
      ).rejects.toThrow(NotFoundError);
    });

    it('throws when maxEntries limit reached', async () => {
      const table = await tableRepo.findByBasePath('products');
      await tableRepo.update(table!.id, { maxEntries: 1 });
      await service.createEntry('products', { title: 'A', price: 1 });
      await expect(
        service.createEntry('products', { title: 'B', price: 2 })
      ).rejects.toThrow(MaxEntriesError);
    });

    it('throws when required field is missing', async () => {
      await expect(
        service.createEntry('products', { price: 1 })
      ).rejects.toThrow(ValidationError);
    });

    it('throws on wrong type: string field receives number', async () => {
      await expect(
        service.createEntry('products', { title: 123, price: 1 })
      ).rejects.toThrow(ValidationError);
    });

    it('throws on wrong type: number field receives string', async () => {
      await expect(
        service.createEntry('products', { title: 'X', price: 'cheap' })
      ).rejects.toThrow(ValidationError);
    });

    it('date field: valid ISO string accepted', async () => {
      await service.createTable(
        {
          name: 'Events',
          basePath: 'events',
          schema: [{ name: 'date', type: 'date', required: true }],
        },
        'user-1',
        'user'
      );
      const view = await service.createEntry('events', {
        date: '2026-03-26T00:00:00.000Z',
      });
      expect(view.date).toBe('2026-03-26T00:00:00.000Z');
    });

    it('date field: invalid date string throws', async () => {
      await service.createTable(
        {
          name: 'Events',
          basePath: 'events',
          schema: [{ name: 'date', type: 'date', required: true }],
        },
        'user-1',
        'user'
      );
      await expect(
        service.createEntry('events', { date: 'not-a-date' })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('listEntries', () => {
    beforeEach(async () => {
      await service.createTable(
        { name: 'Products', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
    });

    it('returns empty array when no entries', async () => {
      const entries = await service.listEntries('products');
      expect(entries).toHaveLength(0);
    });

    it('returns flattened CrudEntryView array', async () => {
      await service.createEntry('products', { title: 'A', price: 1 });
      const entries = await service.listEntries('products');
      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('A');
      expect(entries[0].price).toBe(1);
      expect(typeof entries[0].id).toBe('string');
      expect(entries[0].createdAt).toBeInstanceOf(Date);
    });

    it('throws on non-existent basePath', async () => {
      await expect(service.listEntries('nonexistent')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getEntry', () => {
    it('returns flattened CrudEntryView', async () => {
      await service.createTable(
        { name: 'Products', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
      const created = await service.createEntry('products', {
        title: 'A',
        price: 1,
      });
      const found = await service.getEntry('products', created.id as string);
      expect(found).not.toBeNull();
      expect(found?.title).toBe('A');
    });

    it('returns null for non-existent entryId', async () => {
      await service.createTable(
        { name: 'Products', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
      const found = await service.getEntry('products', 'nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('updateEntry (PUT — full replace)', () => {
    beforeEach(async () => {
      await service.createTable(
        { name: 'Products', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
    });

    it('replaces all data fields', async () => {
      const created = await service.createEntry('products', {
        title: 'Old',
        price: 1,
      });
      const updated = await service.updateEntry(
        'products',
        created.id as string,
        { title: 'New', price: 99 },
        false
      );
      expect(updated?.title).toBe('New');
      expect(updated?.price).toBe(99);
    });

    it('throws if required field is missing in body', async () => {
      const created = await service.createEntry('products', {
        title: 'Old',
        price: 1,
      });
      await expect(
        service.updateEntry(
          'products',
          created.id as string,
          { title: 'New' },
          false
        )
      ).rejects.toThrow(ValidationError);
    });

    it('strips extra fields not in schema', async () => {
      const created = await service.createEntry('products', {
        title: 'Old',
        price: 1,
      });
      const updated = await service.updateEntry(
        'products',
        created.id as string,
        { title: 'New', price: 99, extra: 'ignored' },
        false
      );
      expect((updated as Record<string, unknown>).extra).toBeUndefined();
    });
  });

  describe('updateEntry (PATCH — partial merge)', () => {
    beforeEach(async () => {
      await service.createTable(
        { name: 'Products', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
    });

    it('merges only provided fields, preserves others', async () => {
      const created = await service.createEntry('products', {
        title: 'Old',
        price: 1,
        active: true,
      });
      const updated = await service.updateEntry(
        'products',
        created.id as string,
        { price: 99 },
        true
      );
      expect(updated?.title).toBe('Old');
      expect(updated?.price).toBe(99);
      expect(updated?.active).toBe(true);
    });

    it('does NOT require required fields if not in body', async () => {
      const created = await service.createEntry('products', {
        title: 'Old',
        price: 1,
      });
      const updated = await service.updateEntry(
        'products',
        created.id as string,
        { price: 50 },
        true
      );
      expect(updated?.price).toBe(50);
    });

    it('strips extra fields not in schema', async () => {
      const created = await service.createEntry('products', {
        title: 'Old',
        price: 1,
      });
      const updated = await service.updateEntry(
        'products',
        created.id as string,
        { price: 50, extra: 'ignored' },
        true
      );
      expect((updated as Record<string, unknown>).extra).toBeUndefined();
    });
  });

  describe('deleteEntry', () => {
    it('deletes entry, returns true', async () => {
      await service.createTable(
        { name: 'Products', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
      const created = await service.createEntry('products', {
        title: 'A',
        price: 1,
      });
      const deleted = await service.deleteEntry(
        'products',
        created.id as string
      );
      expect(deleted).toBe(true);
    });

    it('returns false for non-existent entryId', async () => {
      await service.createTable(
        { name: 'Products', basePath: 'products', schema: baseSchema },
        'user-1',
        'user'
      );
      const deleted = await service.deleteEntry('products', 'nonexistent');
      expect(deleted).toBe(false);
    });
  });
});
