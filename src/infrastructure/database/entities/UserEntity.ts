import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('users')
@Index('idx_users_status', ['status'])
export class UserEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column({ type: 'text', unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  email?: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @Column({ name: 'password_salt', type: 'text' })
  passwordSalt!: string;

  @Column({ type: 'text', default: 'enabled' })
  status!: string;

  @Column({ type: 'text', default: 'admin' })
  role!: string;

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
