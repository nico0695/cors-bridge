import type {
  ProxyEndpoint,
  CreateProxyEndpointDto,
  UpdateProxyEndpointDto,
} from '../../domain/ProxyEndpoint.js';

export interface ProxyEndpointRepository {
  findAll(): Promise<ProxyEndpoint[]>;
  findById(id: string): Promise<ProxyEndpoint | null>;
  findByPath(path: string): Promise<ProxyEndpoint | null>;
  save(dto: CreateProxyEndpointDto): Promise<ProxyEndpoint>;
  update(
    id: string,
    dto: UpdateProxyEndpointDto
  ): Promise<ProxyEndpoint | null>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
}
