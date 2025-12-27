export interface ProxyEndpoint {
  id: string;
  name: string;
  path: string;
  baseUrl?: string;
  groupId?: string;
  enabled: boolean;
  statusCodeOverride?: number;
  delayMs: number;
  useCache: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProxyEndpointDto {
  name: string;
  path: string;
  baseUrl?: string;
  groupId?: string;
  enabled?: boolean;
  statusCodeOverride?: number;
  delayMs?: number;
  useCache?: boolean;
}

export interface UpdateProxyEndpointDto {
  name?: string;
  path?: string;
  baseUrl?: string;
  groupId?: string;
  enabled?: boolean;
  statusCodeOverride?: number;
  delayMs?: number;
  useCache?: boolean;
}
