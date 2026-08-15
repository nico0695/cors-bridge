import { describe, expect, it } from '@jest/globals';
import {
  normalizeEndpointPath,
  validateMockContentType,
  validatePublicHttpUrl,
  validateResponseData,
} from '../inputValidation.js';

describe('inputValidation', () => {
  describe('normalizeEndpointPath', () => {
    it('normalizes a path with a missing leading slash', () => {
      expect(normalizeEndpointPath('users/test')).toBe('/users/test');
    });

    it('rejects invalid path segments', () => {
      expect(() => normalizeEndpointPath('/users//test')).toThrow(
        'Path contains invalid segments'
      );
    });

    it('rejects uppercase characters', () => {
      expect(() => normalizeEndpointPath('/Users/Test')).toThrow(
        'Path can only contain lowercase letters, numbers, slashes, hyphens, and underscores'
      );
    });
  });

  describe('validatePublicHttpUrl', () => {
    it('accepts valid public URLs', () => {
      expect(validatePublicHttpUrl('https://api.example.com')).toBe(
        'https://api.example.com'
      );
    });

    it('rejects localhost URLs', () => {
      expect(() => validatePublicHttpUrl('http://localhost:8080')).toThrow(
        'URL must not target localhost or private IP ranges'
      );
    });

    it('rejects embedded credentials', () => {
      expect(() =>
        validatePublicHttpUrl('https://user:pass@example.com')
      ).toThrow('URL must not include embedded credentials');
    });
  });

  describe('validateMockContentType', () => {
    it('accepts allowed content types', () => {
      expect(validateMockContentType('application/json')).toBe(
        'application/json'
      );
    });

    it('rejects disallowed content types', () => {
      expect(() => validateMockContentType('application/pdf')).toThrow(
        'Content type is not allowed'
      );
    });
  });

  describe('validateResponseData', () => {
    it('accepts serializable payloads', () => {
      expect(() => validateResponseData({ ok: true })).not.toThrow();
    });

    it('rejects oversized payloads', () => {
      expect(() =>
        validateResponseData({ value: 'x'.repeat(1024 * 100) })
      ).toThrow('Response data must be at most 102400 bytes');
    });
  });
});
