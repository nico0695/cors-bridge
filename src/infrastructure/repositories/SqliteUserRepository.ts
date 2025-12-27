import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { UserRepository } from '../../application/repositories/UserRepository.js';
import type {
  CreateUserRecord,
  UpdateUserRecord,
  User,
} from '../../domain/User.js';
import type { Logger } from 'pino';

interface UserRow {
  id: string;
  name: string;
  email: string | null;
  password_hash: string;
  password_salt: string;
  status: string;
  role: string;
  created_at: number;
  updated_at: number;
}

export class SqliteUserRepository implements UserRepository {
  private db: Database.Database;

  constructor(
    private readonly logger: Logger,
    dbPath = 'data/mock-endpoints.db'
  ) {
    const directory = dirname(dbPath);
    if (directory && directory !== '.') {
      mkdirSync(directory, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        email TEXT,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'enabled',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    `);
    this.migrateDatabase();
    this.logger.info('SQLite database initialized for users');
  }

  private migrateDatabase(): void {
    const columns = this.db.pragma("table_info('users')") as Array<{
      name: string;
    }>;
    const hasRoleColumn = columns.some((col) => col.name === 'role');

    if (!hasRoleColumn) {
      this.logger.info('Migrating users table to add role column...');
      this.db.exec(`
        ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin';
      `);
      this.logger.info(
        'Migration completed: All existing users set to admin role'
      );
    }
  }

  private rowToEntity(row: UserRow): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email ?? undefined,
      passwordHash: row.password_hash,
      passwordSalt: row.password_salt,
      status: row.status as User['status'],
      role: row.role as User['role'],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  findAll(): User[] {
    const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at ASC');
    const rows = stmt.all() as UserRow[];
    return rows.map((row) => this.rowToEntity(row));
  }

  findById(id: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as UserRow | undefined;
    return row ? this.rowToEntity(row) : null;
  }

  findByName(name: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE name = ?');
    const row = stmt.get(name) as UserRow | undefined;
    return row ? this.rowToEntity(row) : null;
  }

  save(data: CreateUserRecord): User {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO users (
        id, name, email, password_hash, password_salt, status, role, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.email ?? null,
      data.passwordHash,
      data.passwordSalt,
      data.status,
      data.role,
      now,
      now
    );

    this.logger.info({ id, name: data.name, role: data.role }, 'User created');
    return this.findById(id)!;
  }

  update(id: string, data: UpdateUserRecord): User | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.passwordHash !== undefined) {
      updates.push('password_hash = ?');
      values.push(data.passwordHash);
    }
    if (data.passwordSalt !== undefined) {
      updates.push('password_salt = ?');
      values.push(data.passwordSalt);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      values.push(data.role);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const stmt = this.db.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);

    this.logger.info({ id }, 'User updated');
    return this.findById(id);
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    const deleted = result.changes > 0;
    if (deleted) {
      this.logger.info({ id }, 'User deleted');
    }
    return deleted;
  }

  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  close(): void {
    this.db.close();
  }
}
