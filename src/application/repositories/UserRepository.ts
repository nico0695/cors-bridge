import type {
  CreateUserRecord,
  UpdateUserRecord,
  User,
} from '../../domain/User.js';

export interface UserRepository {
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByName(name: string): Promise<User | null>;
  save(data: CreateUserRecord): Promise<User>;
  update(id: string, data: UpdateUserRecord): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
}
