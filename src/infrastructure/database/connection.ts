import { DataSource } from 'typeorm';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { UserEntity } from './entities/UserEntity.js';
import { MockEndpointEntity } from './entities/MockEndpointEntity.js';
import { ProxyEndpointEntity } from './entities/ProxyEndpointEntity.js';

const dbPath = 'data/main.db';

const directory = dirname(dbPath);
if (directory && directory !== '.') {
  mkdirSync(directory, { recursive: true });
}

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: dbPath,
  synchronize: true,
  logging: false,
  entities: [UserEntity, MockEndpointEntity, ProxyEndpointEntity],
});

let initialized = false;

export async function initializeDatabase(): Promise<DataSource> {
  if (initialized) {
    return AppDataSource;
  }

  await AppDataSource.initialize();
  initialized = true;
  return AppDataSource;
}

export function getDataSource(): DataSource {
  if (!initialized) {
    throw new Error(
      'Database not initialized. Call initializeDatabase() first.'
    );
  }
  return AppDataSource;
}
