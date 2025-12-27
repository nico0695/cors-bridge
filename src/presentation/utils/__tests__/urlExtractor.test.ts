import type { Request } from 'express';
import {
  extractTargetUrl,
  isValidHttpUrl,
  extractAndValidateUrl,
} from '../urlExtractor.js';

// Helper to create mock request with specific URL
function createMockRequest(url: string): Request {
  return {
    url,
  } as Request;
}

describe('urlExtractor', () => {
  describe('extractTargetUrl', () => {
    it('should extract simple URL without query params', () => {
      const req = createMockRequest('/proxy?url=https://api.example.com');
      const result = extractTargetUrl(req);
      expect(result).toBe('https://api.example.com');
    });

    it('should extract URL with single query param', () => {
      const req = createMockRequest(
        '/proxy?url=https://api.example.com?id=1'
      );
      const result = extractTargetUrl(req);
      expect(result).toBe('https://api.example.com?id=1');
    });

    it('should extract URL with multiple query params', () => {
      const req = createMockRequest(
        '/proxy?url=https://api.example.com?id=1&status=active'
      );
      const result = extractTargetUrl(req);
      expect(result).toBe('https://api.example.com?id=1&status=active');
    });

    it('should extract URL with many query params', () => {
      const req = createMockRequest(
        '/proxy?url=https://rickandmortyapi.com/api/character?id=1&location=5&type=human'
      );
      const result = extractTargetUrl(req);
      expect(result).toBe(
        'https://rickandmortyapi.com/api/character?id=1&location=5&type=human'
      );
    });

    it('should handle URL-encoded query params', () => {
      const req = createMockRequest(
        '/proxy?url=https%3A%2F%2Fapi.example.com%2Fusers%3Fid%3D1%26status%3Dactive'
      );
      const result = extractTargetUrl(req);
      expect(result).toBe('https://api.example.com/users?id=1&status=active');
    });

    it('should extract URL when it appears after other query params', () => {
      const req = createMockRequest(
        '/proxy?cache=true&url=https://api.example.com?id=1&status=active'
      );
      const result = extractTargetUrl(req);
      expect(result).toBe('https://api.example.com?id=1&status=active');
    });

    it('should handle URL with fragment', () => {
      const req = createMockRequest(
        '/proxy?url=https://api.example.com?id=1#section'
      );
      const result = extractTargetUrl(req);
      expect(result).toBe('https://api.example.com?id=1#section');
    });

    it('should handle URL with special characters in query values', () => {
      const req = createMockRequest(
        '/proxy?url=https://api.example.com?search=hello%20world&filter=a%2Bb'
      );
      const result = extractTargetUrl(req);
      expect(result).toBe(
        'https://api.example.com?search=hello world&filter=a+b'
      );
    });

    it('should return null when url param is missing', () => {
      const req = createMockRequest('/proxy?cache=true');
      const result = extractTargetUrl(req);
      expect(result).toBeNull();
    });

    it('should return null when url param is empty', () => {
      const req = createMockRequest('/proxy?url=');
      const result = extractTargetUrl(req);
      expect(result).toBeNull();
    });

    it('should handle http URLs (not just https)', () => {
      const req = createMockRequest(
        '/proxy?url=http://api.example.com?id=1&status=active'
      );
      const result = extractTargetUrl(req);
      expect(result).toBe('http://api.example.com?id=1&status=active');
    });

    it('should handle malformed URL encoding gracefully', () => {
      const req = createMockRequest('/proxy?url=https://api.example.com?id=%');
      const result = extractTargetUrl(req);
      // Should return the raw value if decoding fails
      expect(result).toBe('https://api.example.com?id=%');
    });
  });

  describe('isValidHttpUrl', () => {
    it('should validate https URLs', () => {
      expect(isValidHttpUrl('https://api.example.com')).toBe(true);
    });

    it('should validate http URLs', () => {
      expect(isValidHttpUrl('http://api.example.com')).toBe(true);
    });

    it('should validate URLs with paths', () => {
      expect(isValidHttpUrl('https://api.example.com/users')).toBe(true);
    });

    it('should validate URLs with query params', () => {
      expect(isValidHttpUrl('https://api.example.com/users?id=1')).toBe(true);
    });

    it('should reject URLs without protocol', () => {
      expect(isValidHttpUrl('api.example.com')).toBe(false);
    });

    it('should reject URLs with wrong protocol', () => {
      expect(isValidHttpUrl('ftp://api.example.com')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(isValidHttpUrl('')).toBe(false);
    });

    it('should reject malformed URLs', () => {
      expect(isValidHttpUrl('https://')).toBe(false);
    });

    it('should reject non-URL strings', () => {
      expect(isValidHttpUrl('not a url')).toBe(false);
    });
  });

  describe('extractAndValidateUrl', () => {
    it('should return URL when valid', () => {
      const req = createMockRequest('/proxy?url=https://api.example.com');
      const result = extractAndValidateUrl(req);
      expect(result.url).toBe('https://api.example.com');
      expect(result.error).toBeNull();
    });

    it('should return URL with query params when valid', () => {
      const req = createMockRequest(
        '/proxy?url=https://api.example.com?id=1&status=active'
      );
      const result = extractAndValidateUrl(req);
      expect(result.url).toBe('https://api.example.com?id=1&status=active');
      expect(result.error).toBeNull();
    });

    it('should return error when URL is missing', () => {
      const req = createMockRequest('/proxy');
      const result = extractAndValidateUrl(req);
      expect(result.url).toBeNull();
      expect(result.error).toContain('Missing or invalid URL parameter');
    });

    it('should return error when URL is invalid', () => {
      const req = createMockRequest('/proxy?url=not-a-valid-url');
      const result = extractAndValidateUrl(req);
      expect(result.url).toBeNull();
      expect(result.error).toContain('must start with http:// or https://');
    });

    it('should return error when URL has wrong protocol', () => {
      const req = createMockRequest('/proxy?url=ftp://example.com');
      const result = extractAndValidateUrl(req);
      expect(result.url).toBeNull();
      expect(result.error).toContain('must start with http:// or https://');
    });

    it('should return error when URL is malformed', () => {
      const req = createMockRequest('/proxy?url=https://');
      const result = extractAndValidateUrl(req);
      expect(result.url).toBeNull();
      expect(result.error).toContain('properly formatted');
    });

    it('should validate complex URLs with multiple query params', () => {
      const req = createMockRequest(
        '/proxy?url=https://rickandmortyapi.com/api/character?id=1&location=5&type=human'
      );
      const result = extractAndValidateUrl(req);
      expect(result.url).toBe(
        'https://rickandmortyapi.com/api/character?id=1&location=5&type=human'
      );
      expect(result.error).toBeNull();
    });
  });
});
