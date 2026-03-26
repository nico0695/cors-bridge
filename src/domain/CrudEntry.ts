export type CrudEntryData = Record<string, string | number | boolean | null>;

export interface CrudEntry {
  id: string;
  crudTableId: string;
  entryId: string;
  data: CrudEntryData;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrudEntryView {
  id: string;
  [field: string]: unknown;
  createdAt: Date;
  updatedAt: Date;
}
