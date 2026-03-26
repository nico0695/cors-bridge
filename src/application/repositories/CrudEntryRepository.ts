import type { CrudEntry, CrudEntryData } from '../../domain/CrudEntry.js';

export interface CrudEntryRepository {
  findAllByCrudTable(crudTableId: string): Promise<CrudEntry[]>;
  findByEntryId(
    crudTableId: string,
    entryId: string
  ): Promise<CrudEntry | null>;
  countByCrudTable(crudTableId: string): Promise<number>;
  save(
    crudTableId: string,
    entryId: string,
    data: CrudEntryData
  ): Promise<CrudEntry>;
  update(
    crudTableId: string,
    entryId: string,
    data: CrudEntryData
  ): Promise<CrudEntry | null>;
  deleteByEntryId(crudTableId: string, entryId: string): Promise<boolean>;
  deleteAllByCrudTable(crudTableId: string): Promise<void>;
}
