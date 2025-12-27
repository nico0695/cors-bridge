import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import type { UserRepository } from '../../application/repositories/UserRepository.js';
import type {
  CreateUserRecord,
  UpdateUserRecord,
  User,
} from '../../domain/User.js';
import type { Logger } from 'pino';
import { getDataSource } from '../database/connection.js';
import { UserEntity } from '../database/entities/UserEntity.js';

export class TypeOrmUserRepository implements UserRepository {
  private repository: Repository<UserEntity>;

  constructor(private readonly logger: Logger) {
    this.repository = getDataSource().getRepository(UserEntity);
  }

  private entityToUser(entity: UserEntity): User {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      passwordHash: entity.passwordHash,
      passwordSalt: entity.passwordSalt,
      status: entity.status as User['status'],
      role: entity.role as User['role'],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async findAll(): Promise<User[]> {
    const entities = await this.repository.find({
      order: { createdAt: 'ASC' },
    });
    return entities.map(this.entityToUser);
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOneBy({ id });
    return entity ? this.entityToUser(entity) : null;
  }

  async findByName(name: string): Promise<User | null> {
    const entity = await this.repository.findOneBy({ name });
    return entity ? this.entityToUser(entity) : null;
  }

  async save(data: CreateUserRecord): Promise<User> {
    const id = randomUUID();
    const now = new Date();

    const entity = this.repository.create({
      id,
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      passwordSalt: data.passwordSalt,
      status: data.status,
      role: data.role,
      createdAt: now,
      updatedAt: now,
    });

    await this.repository.save(entity);
    this.logger.info({ id, name: data.name, role: data.role }, 'User created');

    return this.entityToUser(entity);
  }

  async update(id: string, data: UpdateUserRecord): Promise<User | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const updateData: Partial<UserEntity> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email ?? undefined;
    if (data.passwordHash !== undefined)
      updateData.passwordHash = data.passwordHash;
    if (data.passwordSalt !== undefined)
      updateData.passwordSalt = data.passwordSalt;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.role !== undefined) updateData.role = data.role;

    await this.repository.update({ id }, updateData);
    this.logger.info({ id }, 'User updated');

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id });
    const deleted = (result.affected ?? 0) > 0;
    if (deleted) {
      this.logger.info({ id }, 'User deleted');
    }
    return deleted;
  }

  async count(): Promise<number> {
    return this.repository.count();
  }

  close(): void {
    // TypeORM DataSource manages connections, no need to close individual repositories
  }
}
