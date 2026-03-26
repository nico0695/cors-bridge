import type {
  CrudTable,
  CreateCrudTableDto,
  UpdateCrudTableDto,
} from '../../domain/CrudTable.js';

export interface CrudTableRepository {
  findAll(): Promise<CrudTable[]>;
  findAllByOwner(ownerUserId: string): Promise<CrudTable[]>;
  findById(id: string): Promise<CrudTable | null>;
  findByBasePath(basePath: string): Promise<CrudTable | null>;
  countByOwner(ownerUserId: string): Promise<number>;
  save(dto: CreateCrudTableDto, ownerUserId: string): Promise<CrudTable>;
  update(id: string, dto: UpdateCrudTableDto): Promise<CrudTable | null>;
  delete(id: string): Promise<boolean>;
}
