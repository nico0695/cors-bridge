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
});

class InMemoryUserRepository implements UserRepository {
  private users: User[] = [];
  private counter = 0;

  findAll(): User[] {
    return [...this.users];
  }

  findById(id: string): User | null {
    return this.users.find((user) => user.id === id) ?? null;
  }

  findByName(name: string): User | null {
    return this.users.find(
      (user) => user.name.toLowerCase() === name.toLowerCase()
    ) ?? null;
  }

  save(data: CreateUserRecord): User {
    const id = `user-${++this.counter}`;
    const now = new Date();
    const user = createMockUser(id, data, {
      createdAt: now,
      updatedAt: now,
    });
    this.users.push(user);
    return user;
  }

  update(id: string, data: UpdateUserRecord): User | null {
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

  delete(id: string): boolean {
    const initialLength = this.users.length;
    this.users = this.users.filter((user) => user.id !== id);
    return this.users.length !== initialLength;
  }

  count(): number {
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

  it('creates users with hashed passwords and returns public profile', () => {
    const user = service.createUser({
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

    const stored = repository.findById(user.id);
    expect(stored).not.toBeNull();
    expect(stored?.passwordHash).toBeDefined();
    expect(stored?.passwordSalt).toBeDefined();
    expect(stored?.passwordHash).not.toEqual('secure-password');
  });

  it('prevents duplicate user names', () => {
    service.createUser({ name: 'Admin', password: 'password' });

    expect(() =>
      service.createUser({ name: 'Admin', password: 'password' })
    ).toThrow(/already exists/);
  });

  it('authenticates valid users and issues tokens', () => {
    const created = service.createUser({
      name: 'Admin',
      password: 'password123',
    });

    const tokens = service.authenticate('Admin', 'password123');

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

  it('refreshes tokens for enabled users', () => {
    service.createUser({ name: 'Admin', password: 'password123' });
    const { refreshToken } = service.authenticate('Admin', 'password123');

    const refreshed = service.refreshTokens(refreshToken);

    expect(refreshed.accessToken).toBeDefined();
    expect(refreshed.refreshToken).toBeDefined();
    expect(refreshed.user.name).toBe('Admin');
  });

  it('updates user details and enforces constraints', () => {
    const created = service.createUser({
      name: 'Admin',
      password: 'password123',
      email: 'admin@example.com',
    });

    const updated = service.updateUser(created.id, {
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

    expect(() => service.updateUser(created.id, { password: '123' })).toThrow(
      /at least/
    );
  });
});
