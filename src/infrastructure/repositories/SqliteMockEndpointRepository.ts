import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { MockEndpointRepository } from '../../application/repositories/MockEndpointRepository.js';
import type {
  MockEndpoint,
  CreateMockEndpointDto,
  UpdateMockEndpointDto,
} from '../../domain/MockEndpoint.js';
import type { Logger } from 'pino';

interface MockEndpointRow {
  id: string;
  name: string;
  path: string;
  group_id: string | null;
  response_data: string;
  content_type: string;
  status_code: number;
  enabled: number;
  delay_ms: number;
  created_at: number;
  updated_at: number;
}

export class SqliteMockEndpointRepository implements MockEndpointRepository {
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
      CREATE TABLE IF NOT EXISTS mock_endpoints (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        group_id TEXT,
        response_data TEXT NOT NULL,
        content_type TEXT DEFAULT 'application/json',
        status_code INTEGER DEFAULT 200,
        enabled INTEGER DEFAULT 1,
        delay_ms INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_path ON mock_endpoints(path);
      CREATE INDEX IF NOT EXISTS idx_enabled ON mock_endpoints(enabled);
    `);
    this.logger.info('SQLite database initialized for mock endpoints');
  }

  private rowToEntity(row: MockEndpointRow): MockEndpoint {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      groupId: row.group_id || undefined,
      responseData: JSON.parse(row.response_data),
      contentType: row.content_type,
      statusCode: row.status_code,
      enabled: row.enabled === 1,
      delayMs: row.delay_ms,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  findAll(): MockEndpoint[] {
    const stmt = this.db.prepare(
      'SELECT * FROM mock_endpoints ORDER BY created_at DESC'
    );
    const rows = stmt.all() as MockEndpointRow[];
    return rows.map((row) => this.rowToEntity(row));
  }

  findById(id: string): MockEndpoint | null {
    const stmt = this.db.prepare('SELECT * FROM mock_endpoints WHERE id = ?');
    const row = stmt.get(id) as MockEndpointRow | undefined;
    return row ? this.rowToEntity(row) : null;
  }

  findByPath(path: string): MockEndpoint | null {
    const stmt = this.db.prepare('SELECT * FROM mock_endpoints WHERE path = ?');
    const row = stmt.get(path) as MockEndpointRow | undefined;
    return row ? this.rowToEntity(row) : null;
  }

  save(dto: CreateMockEndpointDto): MockEndpoint {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO mock_endpoints (
        id, name, path, group_id, response_data, content_type,
        status_code, enabled, delay_ms, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      dto.name,
      dto.path,
      dto.groupId || null,
      JSON.stringify(dto.responseData),
      dto.contentType || 'application/json',
      dto.statusCode || 200,
      dto.enabled !== false ? 1 : 0,
      dto.delayMs || 0,
      now,
      now
    );

    this.logger.info({ id, path: dto.path }, 'Mock endpoint created');
    return this.findById(id)!;
  }

  update(id: string, dto: UpdateMockEndpointDto): MockEndpoint | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (dto.name !== undefined) {
      updates.push('name = ?');
      values.push(dto.name);
    }
    if (dto.path !== undefined) {
      updates.push('path = ?');
      values.push(dto.path);
    }
    if (dto.groupId !== undefined) {
      updates.push('group_id = ?');
      values.push(dto.groupId);
    }
    if (dto.responseData !== undefined) {
      updates.push('response_data = ?');
      values.push(JSON.stringify(dto.responseData));
    }
    if (dto.contentType !== undefined) {
      updates.push('content_type = ?');
      values.push(dto.contentType);
    }
    if (dto.statusCode !== undefined) {
      updates.push('status_code = ?');
      values.push(dto.statusCode);
    }
    if (dto.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(dto.enabled ? 1 : 0);
    }
    if (dto.delayMs !== undefined) {
      updates.push('delay_ms = ?');
      values.push(dto.delayMs);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const stmt = this.db.prepare(
      `UPDATE mock_endpoints SET ${updates.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);

    this.logger.info({ id }, 'Mock endpoint updated');
    return this.findById(id);
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM mock_endpoints WHERE id = ?');
    const result = stmt.run(id);
    const deleted = result.changes > 0;
    if (deleted) {
      this.logger.info({ id }, 'Mock endpoint deleted');
    }
    return deleted;
  }

  count(): number {
    const stmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM mock_endpoints'
    );
    const result = stmt.get() as { count: number };
    return result.count;
  }

  close(): void {
    this.db.close();
  }
}
