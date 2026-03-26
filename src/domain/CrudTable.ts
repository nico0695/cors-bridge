export type CrudFieldType = 'string' | 'number' | 'boolean' | 'date';

export interface CrudFieldDefinition {
  name: string;
  type: CrudFieldType;
  required: boolean;
}

export interface CrudTable {
  id: string;
  name: string;
  basePath: string;
  schema: CrudFieldDefinition[];
  maxEntries: number;
  ownerUserId: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCrudTableDto {
  name: string;
  basePath: string;
  schema: CrudFieldDefinition[];
  maxEntries?: number;
  enabled?: boolean;
}

export interface UpdateCrudTableDto {
  name?: string;
  basePath?: string;
  schema?: CrudFieldDefinition[];
  maxEntries?: number;
  enabled?: boolean;
}
