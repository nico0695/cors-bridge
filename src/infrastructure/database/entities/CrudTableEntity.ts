import { Entity, PrimaryColumn, Column, Index } from 'typeorm';
import type { CrudFieldDefinition } from '../../../domain/CrudTable.js';

const jsonTransformer = {
  to: (v: unknown) => JSON.stringify(v),
  from: (v: string) => JSON.parse(v),
};

const booleanTransformer = {
  to: (v: boolean) => (v ? 1 : 0),
  from: (v: number) => v === 1,
};

const dateTransformer = {
  to: (v: Date) => v.getTime(),
  from: (v: number) => new Date(v),
};

@Entity('crud_tables')
@Index('idx_crud_tables_base_path', ['basePath'])
@Index('idx_crud_tables_owner', ['ownerUserId'])
@Index('idx_crud_tables_enabled', ['enabled'])
export class CrudTableEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ name: 'base_path', type: 'text', unique: true })
  basePath!: string;

  @Column({ type: 'text', transformer: jsonTransformer })
  schema!: CrudFieldDefinition[];

  @Column({ name: 'max_entries', type: 'integer', default: 15 })
  maxEntries!: number;

  @Column({ name: 'owner_user_id', type: 'text' })
  ownerUserId!: string;

  @Column({ type: 'integer', default: 1, transformer: booleanTransformer })
  enabled!: boolean;

  @Column({ name: 'created_at', type: 'integer', transformer: dateTransformer })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'integer', transformer: dateTransformer })
  updatedAt!: Date;
}
