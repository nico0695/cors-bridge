const MAX_NAME_LENGTH = 80;
const MAX_GROUP_ID_LENGTH = 50;
const MAX_PATH_LENGTH = 120;
const MAX_DELAY_MS = 10000;
const MAX_RESPONSE_DATA_BYTES = 100 * 1024;
const ALLOWED_MOCK_CONTENT_TYPES = new Set([
  'application/json',
  'text/plain',
  'application/xml',
  'text/xml',
  'text/html',
]);

export class InputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputValidationError';
  }
}

export function normalizeRequiredName(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new InputValidationError('Name is required');
  }

  const value = raw.trim();
  if (!value) {
    throw new InputValidationError('Name is required');
  }
  if (value.length > MAX_NAME_LENGTH) {
    throw new InputValidationError(
      `Name must be at most ${MAX_NAME_LENGTH} characters long`
    );
  }

  return value;
}

export function normalizeOptionalGroupId(raw: unknown): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== 'string') {
    throw new InputValidationError('Group ID must be a string');
  }

  const value = raw.trim();
  if (!value) {
    return undefined;
  }
  if (value.length > MAX_GROUP_ID_LENGTH) {
    throw new InputValidationError(
      `Group ID must be at most ${MAX_GROUP_ID_LENGTH} characters long`
    );
  }
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new InputValidationError(
      'Group ID can only contain letters, numbers, hyphens, and underscores'
    );
  }

  return value;
}

export function normalizeEndpointPath(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new InputValidationError('Path is required');
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    throw new InputValidationError('Path is required');
  }

  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  if (normalized.length > MAX_PATH_LENGTH) {
    throw new InputValidationError(
      `Path must be at most ${MAX_PATH_LENGTH} characters long`
    );
  }
  if (normalized.includes('..') || normalized.includes('//')) {
    throw new InputValidationError('Path contains invalid segments');
  }
  if (/%2e|%2f|%5c/i.test(normalized)) {
    throw new InputValidationError('Path contains invalid encoded characters');
  }
  if (!/^\/[a-z0-9/_-]+$/.test(normalized)) {
    throw new InputValidationError(
      'Path can only contain lowercase letters, numbers, slashes, hyphens, and underscores'
    );
  }

  return normalized;
}

export function validateHttpStatusCode(
  raw: unknown,
  fieldName: string = 'Status code'
): number {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) {
    throw new InputValidationError(
      `${fieldName} must be an integer between 100 and 599`
    );
  }
  if (raw < 100 || raw > 599) {
    throw new InputValidationError(`${fieldName} must be between 100 and 599`);
  }

  return raw;
}

export function validateDelayMs(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) {
    throw new InputValidationError(
      `Delay must be an integer between 0 and ${MAX_DELAY_MS}ms`
    );
  }
  if (raw < 0 || raw > MAX_DELAY_MS) {
    throw new InputValidationError(
      `Delay must be between 0 and ${MAX_DELAY_MS}ms`
    );
  }

  return raw;
}

export function validateMockContentType(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new InputValidationError('Content type must be a string');
  }

  const value = raw.trim().toLowerCase();
  if (!ALLOWED_MOCK_CONTENT_TYPES.has(value)) {
    throw new InputValidationError('Content type is not allowed');
  }

  return value;
}

export function validateResponseData(raw: unknown): void {
  let serialized: string | undefined;

  try {
    serialized = JSON.stringify(raw);
  } catch {
    throw new InputValidationError('Response data must be JSON-serializable');
  }

  if (serialized === undefined) {
    throw new InputValidationError('Response data must be JSON-serializable');
  }

  if (Buffer.byteLength(serialized, 'utf8') > MAX_RESPONSE_DATA_BYTES) {
    throw new InputValidationError(
      `Response data must be at most ${MAX_RESPONSE_DATA_BYTES} bytes`
    );
  }
}

function isPrivateIpv4(hostname: string): boolean {
  const match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return false;
  }

  const octets = match.slice(1).map((part) => Number(part));
  if (octets.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first === 127 ||
    first === 0
  );
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '::1' ||
    isPrivateIpv4(normalized)
  );
}

export function validatePublicHttpUrl(
  raw: unknown,
  fieldName: string = 'URL'
): string {
  if (typeof raw !== 'string') {
    throw new InputValidationError(`${fieldName} must be a string`);
  }

  const value = raw.trim();
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new InputValidationError(
      `${fieldName} must start with http:// or https:// and be properly formatted`
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new InputValidationError(
      `${fieldName} must start with http:// or https:// and be properly formatted`
    );
  }
  if (parsed.username || parsed.password) {
    throw new InputValidationError(
      `${fieldName} must not include embedded credentials`
    );
  }
  if (isBlockedHostname(parsed.hostname)) {
    throw new InputValidationError(
      `${fieldName} must not target localhost or private IP ranges`
    );
  }

  return value;
}

export function parseOptionalPositiveInt(
  raw: unknown,
  fieldName: string,
  maxValue: number
): number | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw new InputValidationError(`${fieldName} must be a positive integer`);
  }

  const value = Number.parseInt(raw, 10);
  if (value < 1 || value > maxValue) {
    throw new InputValidationError(
      `${fieldName} must be between 1 and ${maxValue}`
    );
  }

  return value;
}

export function validateEnumValue<T extends string>(
  raw: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): T | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== 'string') {
    throw new InputValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }
  if (!allowedValues.includes(raw as T)) {
    throw new InputValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }

  return raw as T;
}

export function validateIsoDateString(
  raw: unknown,
  fieldName: string
): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== 'string') {
    throw new InputValidationError(
      `${fieldName} must be a valid ISO 8601 date string`
    );
  }
  if (Number.isNaN(Date.parse(raw))) {
    throw new InputValidationError(
      `${fieldName} must be a valid ISO 8601 date string`
    );
  }

  return raw;
}
