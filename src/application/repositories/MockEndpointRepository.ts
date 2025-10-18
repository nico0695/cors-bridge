import type {
  MockEndpoint,
  CreateMockEndpointDto,
  UpdateMockEndpointDto,
} from '../../domain/MockEndpoint.js';

export interface MockEndpointRepository {
  findAll(): MockEndpoint[];
  findById(id: string): MockEndpoint | null;
  findByPath(path: string): MockEndpoint | null;
  save(dto: CreateMockEndpointDto): MockEndpoint;
  update(id: string, dto: UpdateMockEndpointDto): MockEndpoint | null;
  delete(id: string): boolean;
  count(): number;
}
