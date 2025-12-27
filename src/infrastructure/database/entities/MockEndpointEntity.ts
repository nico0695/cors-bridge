import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('mock_endpoints')
@Index('idx_path', ['path'])
@Index('idx_enabled', ['enabled'])
export class MockEndpointEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', unique: true })
  path!: string;

  @Column({ name: 'group_id', type: 'text', nullable: true })
  groupId?: string;

  @Column({
    name: 'response_data',
    type: 'text',
    transformer: {
      to: (value: unknown) => JSON.stringify(value),
      from: (value: string) => JSON.parse(value),
    },
  })
  responseData!: unknown;

  @Column({ name: 'content_type', type: 'text', default: 'application/json' })
  contentType!: string;

  @Column({ name: 'status_code', type: 'integer', default: 200 })
  statusCode!: number;

  @Column({
    type: 'integer',
    default: 1,
    transformer: {
      to: (value: boolean) => (value ? 1 : 0),
      from: (value: number) => value === 1,
    },
  })
  enabled!: boolean;

  @Column({ name: 'delay_ms', type: 'integer', default: 0 })
  delayMs!: number;

  @Column({
    name: 'created_at',
    type: 'integer',
    transformer: {
      to: (value: Date) => value.getTime(),
      from: (value: number) => new Date(value),
    },
  })
  createdAt!: Date;

  @Column({
    name: 'updated_at',
    type: 'integer',
    transformer: {
      to: (value: Date) => value.getTime(),
      from: (value: number) => new Date(value),
    },
  })
  updatedAt!: Date;
}
