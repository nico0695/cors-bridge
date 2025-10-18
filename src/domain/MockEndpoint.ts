export interface MockEndpoint {
  id: string;
  name: string;
  path: string;
  groupId?: string;
  responseData: unknown;
  contentType: string;
  statusCode: number;
  enabled: boolean;
  delayMs: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMockEndpointDto {
  name: string;
  path: string;
  groupId?: string;
  responseData: unknown;
  contentType?: string;
  statusCode?: number;
  enabled?: boolean;
  delayMs?: number;
}

export interface UpdateMockEndpointDto {
  name?: string;
  path?: string;
  groupId?: string;
  responseData?: unknown;
  contentType?: string;
  statusCode?: number;
  enabled?: boolean;
  delayMs?: number;
}
