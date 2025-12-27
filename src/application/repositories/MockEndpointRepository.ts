import type {
  MockEndpoint,
  CreateMockEndpointDto,
  UpdateMockEndpointDto,
} from '../../domain/MockEndpoint.js';

export interface MockEndpointRepository {
  findAll(): Promise<MockEndpoint[]>;
  findById(id: string): Promise<MockEndpoint | null>;
  findByPath(path: string): Promise<MockEndpoint | null>;
  save(dto: CreateMockEndpointDto): Promise<MockEndpoint>;
  update(id: string, dto: UpdateMockEndpointDto): Promise<MockEndpoint | null>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
}
