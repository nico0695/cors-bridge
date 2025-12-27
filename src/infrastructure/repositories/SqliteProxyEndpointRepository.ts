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
  base_url: string | null;
  group_id: string | null;
  enabled: number;
  status_code_override: number | null;
  delay_ms: number;
  use_cache: number;
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
    const tableExists = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='proxy_endpoints'"
      )
      .get();

    if (!tableExists) {
      this.db.exec(`
        CREATE TABLE proxy_endpoints (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          path TEXT NOT NULL UNIQUE,
          base_url TEXT,
          group_id TEXT,
          enabled INTEGER DEFAULT 1,
          status_code_override INTEGER,
          delay_ms INTEGER DEFAULT 0,
          use_cache INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX idx_proxy_path ON proxy_endpoints(path);
        CREATE INDEX idx_proxy_enabled ON proxy_endpoints(enabled);
      `);
      this.logger.info(
        'SQLite database initialized for proxy endpoints (new schema)'
      );
      return;
    }

    const tableInfo = this.db.pragma('table_info(proxy_endpoints)') as Array<{
      name: string;
      type: string;
      notnull: number;
    }>;
    const columns = tableInfo.map((col) => col.name);

    const needsUseCacheMigration = !columns.includes('use_cache');
    const baseUrlColumn = tableInfo.find((col) => col.name === 'base_url');
    const needsBaseUrlNullable = baseUrlColumn && baseUrlColumn.notnull === 1;

    if (needsUseCacheMigration || needsBaseUrlNullable) {
      this.logger.info(
        'Migrating proxy_endpoints table to support optional baseUrl and caching'
      );

      this.db.exec(`
        -- Create new table with updated schema
        CREATE TABLE proxy_endpoints_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          path TEXT NOT NULL UNIQUE,
          base_url TEXT,
          group_id TEXT,
          enabled INTEGER DEFAULT 1,
          status_code_override INTEGER,
          delay_ms INTEGER DEFAULT 0,
          use_cache INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        -- Copy existing data
        INSERT INTO proxy_endpoints_new
        SELECT
          id, name, path, base_url, group_id, enabled,
          status_code_override, delay_ms,
          ${needsUseCacheMigration ? '0' : 'use_cache'},
          created_at, updated_at
        FROM proxy_endpoints;

        -- Drop old table
        DROP TABLE proxy_endpoints;

        -- Rename new table
        ALTER TABLE proxy_endpoints_new RENAME TO proxy_endpoints;

        -- Recreate indexes
        CREATE INDEX idx_proxy_path ON proxy_endpoints(path);
        CREATE INDEX idx_proxy_enabled ON proxy_endpoints(enabled);
      `);

      this.logger.info('Migration completed successfully');
    } else {
      this.logger.info(
        'Proxy endpoints table schema is up to date, no migration needed'
      );
    }
  }

  private rowToEntity(row: ProxyEndpointRow): ProxyEndpoint {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      baseUrl: row.base_url || undefined,
      groupId: row.group_id || undefined,
      enabled: row.enabled === 1,
      statusCodeOverride: row.status_code_override || undefined,
      delayMs: row.delay_ms,
      useCache: row.use_cache === 1,
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
        status_code_override, delay_ms, use_cache, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      dto.name,
      dto.path,
      dto.baseUrl || null,
      dto.groupId || null,
      dto.enabled !== false ? 1 : 0,
      dto.statusCodeOverride || null,
      dto.delayMs || 0,
      dto.useCache === true ? 1 : 0,
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
    if (dto.useCache !== undefined) {
      updates.push('use_cache = ?');
      values.push(dto.useCache ? 1 : 0);
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
