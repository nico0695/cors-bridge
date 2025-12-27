import type {
  ProxyEndpoint,
  CreateProxyEndpointDto,
  UpdateProxyEndpointDto,
} from '../../domain/ProxyEndpoint.js';

export interface ProxyEndpointRepository {
  findAll(): ProxyEndpoint[];
  findById(id: string): ProxyEndpoint | null;
  findByPath(path: string): ProxyEndpoint | null;
  save(dto: CreateProxyEndpointDto): ProxyEndpoint;
  update(id: string, dto: UpdateProxyEndpointDto): ProxyEndpoint | null;
  delete(id: string): boolean;
  count(): number;
}
