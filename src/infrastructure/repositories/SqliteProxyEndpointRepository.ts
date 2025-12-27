import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ProxyEndpointRepository } from '../../application/repositories/ProxyEndpointRepository.js';
import type {
  ProxyEndpoint,
  CreateProxyEndpointDto,
  UpdateProxyEndpointDto,
} from '../../domain/ProxyEndpoint.js';
import type { Logger } from 'pino';

interface ProxyEndpointRow {
  id: string;
  name: string;
  path: string;
  base_url: string;
  group_id: string | null;
  enabled: number;
  status_code_override: number | null;
  delay_ms: number;
  created_at: number;
  updated_at: number;
}

export class SqliteProxyEndpointRepository implements ProxyEndpointRepository {
  private db: Database.Database;

  constructor(
    private readonly logger: Logger,
    dbPath = 'data/proxy-endpoints.db'
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
      CREATE TABLE IF NOT EXISTS proxy_endpoints (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        base_url TEXT NOT NULL,
        group_id TEXT,
        enabled INTEGER DEFAULT 1,
        status_code_override INTEGER,
        delay_ms INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_proxy_path ON proxy_endpoints(path);
      CREATE INDEX IF NOT EXISTS idx_proxy_enabled ON proxy_endpoints(enabled);
    `);
    this.logger.info('SQLite database initialized for proxy endpoints');
  }

  private rowToEntity(row: ProxyEndpointRow): ProxyEndpoint {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      baseUrl: row.base_url,
      groupId: row.group_id || undefined,
      enabled: row.enabled === 1,
      statusCodeOverride: row.status_code_override || undefined,
      delayMs: row.delay_ms,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  findAll(): ProxyEndpoint[] {
    const stmt = this.db.prepare(
      'SELECT * FROM proxy_endpoints ORDER BY created_at DESC'
    );
    const rows = stmt.all() as ProxyEndpointRow[];
    return rows.map((row) => this.rowToEntity(row));
  }

  findById(id: string): ProxyEndpoint | null {
    const stmt = this.db.prepare('SELECT * FROM proxy_endpoints WHERE id = ?');
    const row = stmt.get(id) as ProxyEndpointRow | undefined;
    return row ? this.rowToEntity(row) : null;
  }

  findByPath(path: string): ProxyEndpoint | null {
    const stmt = this.db.prepare(
      'SELECT * FROM proxy_endpoints WHERE path = ?'
    );
    const row = stmt.get(path) as ProxyEndpointRow | undefined;
    return row ? this.rowToEntity(row) : null;
  }

  save(dto: CreateProxyEndpointDto): ProxyEndpoint {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO proxy_endpoints (
        id, name, path, base_url, group_id, enabled,
        status_code_override, delay_ms, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      dto.name,
      dto.path,
      dto.baseUrl,
      dto.groupId || null,
      dto.enabled !== false ? 1 : 0,
      dto.statusCodeOverride || null,
      dto.delayMs || 0,
      now,
      now
    );

    this.logger.info({ id, path: dto.path }, 'Proxy endpoint created');
    return this.findById(id)!;
  }

  update(id: string, dto: UpdateProxyEndpointDto): ProxyEndpoint | null {
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
    if (dto.baseUrl !== undefined) {
      updates.push('base_url = ?');
      values.push(dto.baseUrl);
    }
    if (dto.groupId !== undefined) {
      updates.push('group_id = ?');
      values.push(dto.groupId);
    }
    if (dto.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(dto.enabled ? 1 : 0);
    }
    if (dto.statusCodeOverride !== undefined) {
      updates.push('status_code_override = ?');
      values.push(dto.statusCodeOverride || null);
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
      `UPDATE proxy_endpoints SET ${updates.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);

    this.logger.info({ id }, 'Proxy endpoint updated');
    return this.findById(id);
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM proxy_endpoints WHERE id = ?');
    const result = stmt.run(id);
    const deleted = result.changes > 0;
    if (deleted) {
      this.logger.info({ id }, 'Proxy endpoint deleted');
    }
    return deleted;
  }

  count(): number {
    const stmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM proxy_endpoints'
    );
    const result = stmt.get() as { count: number };
    return result.count;
  }

  close(): void {
    this.db.close();
  }
}
