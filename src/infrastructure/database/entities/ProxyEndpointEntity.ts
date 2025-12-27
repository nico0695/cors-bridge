import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('proxy_endpoints')
@Index('idx_proxy_path', ['path'])
@Index('idx_proxy_enabled', ['enabled'])
export class ProxyEndpointEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', unique: true })
  path!: string;

  @Column({ name: 'base_url', type: 'text', nullable: true })
  baseUrl?: string;

  @Column({ name: 'group_id', type: 'text', nullable: true })
  groupId?: string;

  @Column({
    type: 'integer',
    default: 1,
    transformer: {
      to: (value: boolean) => (value ? 1 : 0),
      from: (value: number) => value === 1,
    },
  })
  enabled!: boolean;

  @Column({ name: 'status_code_override', type: 'integer', nullable: true })
  statusCodeOverride?: number;

  @Column({ name: 'delay_ms', type: 'integer', default: 0 })
  delayMs!: number;

  @Column({
    name: 'use_cache',
    type: 'integer',
    default: 0,
    transformer: {
      to: (value: boolean) => (value ? 1 : 0),
      from: (value: number) => value === 1,
    },
  })
  useCache!: boolean;

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
