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

  // Additional safeguard against SSRF: explicitly block non-public IP literals
  function isBlockedIpLiteral(hostname: string): boolean {
    // Check for IPv4 literal
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const octets = ipv4Match.slice(1).map((part) => Number(part));
      if (octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) {
        return false;
      }
      const [a, b, c, d] = octets;
      const addr = (a << 24) | (b << 16) | (c << 8) | d;

      // Helper to build netmask-based ranges
      const inRange = (base: number, mask: number) => (addr & mask) === base;

      // 10.0.0.0/8
      if (inRange(0x0a000000, 0xff000000)) return true;
      // 127.0.0.0/8 (loopback)
      if (inRange(0x7f000000, 0xff000000)) return true;
      // 172.16.0.0/12
      if (inRange(0xac100000, 0xfff00000)) return true;
      // 192.168.0.0/16
      if (inRange(0xc0a80000, 0xffff0000)) return true;
      // 169.254.0.0/16 (link-local)
      if (inRange(0xa9fe0000, 0xffff0000)) return true;
      // 0.0.0.0/8 (software)
      if (inRange(0x00000000, 0xff000000)) return true;
      // 100.64.0.0/10 (carrier-grade NAT)
      if (inRange(0x64400000, 0xffc00000)) return true;
      // 192.0.0.0/24 (IETF protocol assignments)
      if (inRange(0xc0000000, 0xffffff00)) return true;
      // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (TEST-NET*)
      if (inRange(0xc0000200, 0xffffff00)) return true;
      if (inRange(0xc6336400, 0xffffff00)) return true;
      if (inRange(0xcb007100, 0xffffff00)) return true;
      // 198.18.0.0/15 (benchmarking)
      if (inRange(0xc6120000, 0xfffe0000)) return true;
      // 224.0.0.0/4 (multicast) and 240.0.0.0/4 (reserved)
      if ((addr & 0xf0000000) === 0xe0000000) return true;
      if ((addr & 0xf0000000) === 0xf0000000) return true;

      return false;
    }

    // Check for IPv6 literal (very lightweight classification)
    if (hostname.includes(':')) {
      const h = hostname.toLowerCase();
      // Loopback
      if (h === '::1') return true;
      // Unique local addresses fc00::/7 (fc00::/8 and fd00::/8)
      if (h.startsWith('fc') || h.startsWith('fd')) return true;
      // Link-local fe80::/10 (fe80:: through febf::)
      if (h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) {
        return true;
      }
    }

    return false;
  }

  if (isBlockedHostname(parsed.hostname) || isBlockedIpLiteral(parsed.hostname)) {
    throw new InputValidationError(
      `${fieldName} must not target localhost or non-public IP ranges`
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
