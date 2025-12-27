import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import type { Request, Response } from 'express';
import { ProxyApiController } from '../ProxyApiController.js';
import type { ProxyEndpointService } from '../../../application/services/ProxyEndpointService.js';
import type { ProxyEndpoint } from '../../../domain/ProxyEndpoint.js';
import type { Logger } from 'pino';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('ProxyApiController', () => {
  let controller: ProxyApiController;
  let mockService: jest.Mocked<ProxyEndpointService>;
  let mockLogger: jest.Mocked<Logger>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockService = {
      getEndpointByPath: jest.fn(),
    } as unknown as jest.Mocked<ProxyEndpointService>;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    mockRequest = {
      params: {},
      method: 'GET',
      headers: {},
      body: {},
    };

    const jsonMock = jest.fn();
    const sendMock = jest.fn();
    const setHeaderMock = jest.fn();
    const statusMock = jest.fn(() => ({
      json: jsonMock,
      send: sendMock,
    }));

    mockResponse = {
      status: statusMock as unknown as Response['status'],
      json: jsonMock as unknown as Response['json'],
      send: sendMock as unknown as Response['send'],
      setHeader: setHeaderMock as unknown as Response['setHeader'],
    };

    controller = new ProxyApiController(mockService, mockLogger);
  });

  describe('forward', () => {
    it('should return 404 when endpoint not found', async () => {
      mockRequest.params = { '0': 'users' };
      mockService.getEndpointByPath.mockReturnValue(null);

      await controller.forward(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockService.getEndpointByPath).toHaveBeenCalledWith('/users');
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      const statusResult = (mockResponse.status as jest.Mock).mock.results[0]
        .value as { json: jest.Mock };
      expect(statusResult.json).toHaveBeenCalledWith({
        error: 'Proxy endpoint not found',
      });
    });

    it('should return 503 when endpoint is disabled', async () => {
      const disabledEndpoint: ProxyEndpoint = {
        id: 'test-id',
        name: 'Test',
        path: '/users',
        baseUrl: 'https://api.example.com',
        enabled: false,
        delayMs: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { '0': 'users' };
      mockService.getEndpointByPath.mockReturnValue(disabledEndpoint);

      await controller.forward(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      const statusResult = (mockResponse.status as jest.Mock).mock.results[0]
        .value as { json: jest.Mock };
      expect(statusResult.json).toHaveBeenCalledWith({
        error: 'Proxy endpoint is disabled',
      });
    });

    it('should return override status without calling upstream', async () => {
      const overrideEndpoint: ProxyEndpoint = {
        id: 'test-id',
        name: 'Test',
        path: '/users',
        baseUrl: 'https://api.example.com',
        enabled: true,
        statusCodeOverride: 500,
        delayMs: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { '0': 'users' };
      mockService.getEndpointByPath.mockReturnValue(overrideEndpoint);

      await controller.forward(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      const statusResult = (mockResponse.status as jest.Mock).mock.results[0]
        .value as { json: jest.Mock };
      expect(statusResult.json).toHaveBeenCalledWith({
        message: 'Endpoint configured with status override',
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return 502 on upstream failure', async () => {
      const endpoint: ProxyEndpoint = {
        id: 'test-id',
        name: 'Test',
        path: '/users',
        baseUrl: 'https://api.example.com',
        enabled: true,
        delayMs: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { '0': 'users' };
      mockService.getEndpointByPath.mockReturnValue(endpoint);

      // Mock fetch failure
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      );

      await controller.forward(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(502);
      const statusResult = (mockResponse.status as jest.Mock).mock.results[0]
        .value as { json: jest.Mock };
      expect(statusResult.json).toHaveBeenCalledWith({
        error: 'Bad Gateway - upstream request failed',
      });
    });
  });
});
