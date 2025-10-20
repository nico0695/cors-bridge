import type {
  CreateUserRecord,
  UpdateUserRecord,
  User,
} from '../../domain/User.js';

export interface UserRepository {
  findAll(): User[];
  findById(id: string): User | null;
  findByName(name: string): User | null;
  save(data: CreateUserRecord): User;
  update(id: string, data: UpdateUserRecord): User | null;
  delete(id: string): boolean;
  count(): number;
}
