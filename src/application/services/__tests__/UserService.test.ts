import { beforeEach, describe, expect, it } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { UserService } from '../UserService.js';
import type {
  CreateUserRecord,
  UpdateUserRecord,
  User,
} from '../../../domain/User.js';
import type { UserRepository } from '../../repositories/UserRepository.js';

const createMockUser = (
  id: string,
  data: CreateUserRecord,
  timestamps: { createdAt: Date; updatedAt: Date }
): User => ({
  id,
  name: data.name,
  email: data.email,
  passwordHash: data.passwordHash,
  passwordSalt: data.passwordSalt,
  status: data.status,
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
  role: 'admin'
});

class InMemoryUserRepository implements UserRepository {
  private users: User[] = [];
  private counter = 0;

  async findAll(): Promise<User[]> {
    return [...this.users];
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async findByName(name: string): Promise<User | null> {
    return (
      this.users.find(
        (user) => user.name.toLowerCase() === name.toLowerCase()
      ) ?? null
    );
  }

  async save(data: CreateUserRecord): Promise<User> {
    const id = `user-${++this.counter}`;
    const now = new Date();
    const user = createMockUser(id, data, {
      createdAt: now,
      updatedAt: now,
    });
    this.users.push(user);
    return user;
  }

  async update(id: string, data: UpdateUserRecord): Promise<User | null> {
    const index = this.users.findIndex((user) => user.id === id);
    if (index === -1) {
      return null;
    }
    const existing = this.users[index];
    const updated: User = {
      ...existing,
      ...('name' in data ? { name: data.name ?? existing.name } : {}),
      ...('email' in data ? { email: data.email ?? undefined } : {}),
      ...('status' in data ? { status: data.status ?? existing.status } : {}),
      ...('passwordHash' in data
        ? { passwordHash: data.passwordHash ?? existing.passwordHash }
        : {}),
      ...('passwordSalt' in data
        ? { passwordSalt: data.passwordSalt ?? existing.passwordSalt }
        : {}),
      updatedAt: new Date(),
    };
    this.users[index] = updated;
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const initialLength = this.users.length;
    this.users = this.users.filter((user) => user.id !== id);
    return this.users.length !== initialLength;
  }

  async count(): Promise<number> {
    return this.users.length;
  }
}

describe('UserService', () => {
  const jwtSecret = 'test-secret';
  let repository: InMemoryUserRepository;
  let service: UserService;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    service = new UserService(repository, jwtSecret);
  });

  it('creates users with hashed passwords and returns public profile', async () => {
    const user = await service.createUser({
      name: 'Admin',
      password: 'secure-password',
      email: 'admin@example.com',
    });

    expect(user).toEqual(
      expect.objectContaining({
        name: 'Admin',
        email: 'admin@example.com',
        status: 'enabled',
      })
    );

    const stored = await repository.findById(user.id);
    expect(stored).not.toBeNull();
    expect(stored?.passwordHash).toBeDefined();
    expect(stored?.passwordSalt).toBeDefined();
    expect(stored?.passwordHash).not.toEqual('secure-password');
  });

  it('prevents duplicate user names', async () => {
    await service.createUser({ name: 'Admin', password: 'password' });

    await expect(() =>
      service.createUser({ name: 'Admin', password: 'password' })
    ).rejects.toThrow(/already exists/);
  });

  it('authenticates valid users and issues tokens', async () => {
    const created = await service.createUser({
      name: 'Admin',
      password: 'password123',
    });

    const tokens = await service.authenticate('Admin', 'password123');

    expect(tokens.user).toEqual(created);
    const accessPayload = jwt.verify(tokens.accessToken, jwtSecret);
    const refreshPayload = jwt.verify(tokens.refreshToken, jwtSecret);

    expect(accessPayload).toEqual(
      expect.objectContaining({
        sub: created.id,
        name: 'Admin',
        type: 'access',
      })
    );
    expect(refreshPayload).toEqual(
      expect.objectContaining({
        sub: created.id,
        type: 'refresh',
      })
    );
  });

  it('refreshes tokens for enabled users', async () => {
    await service.createUser({ name: 'Admin', password: 'password123' });
    const { refreshToken } = await service.authenticate('Admin', 'password123');

    const refreshed = await service.refreshTokens(refreshToken);

    expect(refreshed.accessToken).toBeDefined();
    expect(refreshed.refreshToken).toBeDefined();
    expect(refreshed.user.name).toBe('Admin');
  });

  it('updates user details and enforces constraints', async () => {
    const created = await service.createUser({
      name: 'Admin',
      password: 'password123',
      email: 'admin@example.com',
    });

    const updated = await service.updateUser(created.id, {
      name: 'Admin2',
      email: null,
      password: 'new-pass',
      status: 'blocked',
    });

    expect(updated).toEqual(
      expect.objectContaining({
        name: 'Admin2',
        email: undefined,
        status: 'blocked',
      })
    );

    await expect(() =>
      service.updateUser(created.id, { password: '123' })
    ).rejects.toThrow(/at least/);
  });
});
