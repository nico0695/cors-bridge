import { Entity, PrimaryColumn, Column, Index, Unique } from 'typeorm';
import type { CrudEntryData } from '../../../domain/CrudEntry.js';

@Entity('crud_entries')
@Index('idx_crud_entries_table', ['crudTableId'])
@Unique('uq_crud_table_entry', ['crudTableId', 'entryId'])
export class CrudEntryEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column({ name: 'crud_table_id', type: 'text' })
  crudTableId!: string;

  @Column({ name: 'entry_id', type: 'text' })
  entryId!: string;

  @Column({
    type: 'text',
    transformer: {
      to: (v: CrudEntryData) => JSON.stringify(v),
      from: (v: string) => JSON.parse(v) as CrudEntryData,
    },
  })
  data!: CrudEntryData;

  @Column({
    name: 'created_at',
    type: 'integer',
    transformer: {
      to: (v: Date) => v.getTime(),
      from: (v: number) => new Date(v),
    },
  })
  createdAt!: Date;

  @Column({
    name: 'updated_at',
    type: 'integer',
    transformer: {
      to: (v: Date) => v.getTime(),
      from: (v: number) => new Date(v),
    },
  })
  updatedAt!: Date;
}
