import type { Request } from 'express';

/**
 * Extracts the target URL from request query parameters.
 *
 * This function parses the raw query string to extract the complete URL value
 * from the 'url' parameter, including any query parameters that are part of
 * the target URL itself.
 *
 * @param req - Express request object
 * @returns The complete target URL or null if not found/invalid
 */
export function extractTargetUrl(req: Request): string | null {
  const urlMatch = req.url.match(/[?&]url=(.+)/);

  if (!urlMatch || !urlMatch[1]) {
    return null;
  }

  let targetUrl = urlMatch[1];

  try {
    targetUrl = decodeURIComponent(targetUrl);
  } catch (_e) {
    targetUrl = urlMatch[1];
  }

  return targetUrl;
}

/**
 * Validates that a URL string is properly formatted and uses http/https protocol.
 *
 * @param url - The URL string to validate
 * @returns True if valid, false otherwise
 */
export function isValidHttpUrl(url: string): boolean {
  if (!url) return false;

  // Check for http/https prefix
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }

  // Validate URL format using URL constructor
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts and validates the target URL from a request.
 *
 * @param req - Express request object
 * @returns Object with url (string | null) and error (string | null)
 */
export function extractAndValidateUrl(req: Request): {
  url: string | null;
  error: string | null;
} {
  const url = extractTargetUrl(req);

  if (!url) {
    return {
      url: null,
      error:
        'Missing or invalid URL parameter. Use ?url=https://example.com (must be the last query parameter)',
    };
  }

  if (!isValidHttpUrl(url)) {
    return {
      url: null,
      error:
        'URL must start with http:// or https:// and be properly formatted',
    };
  }

  return { url, error: null };
}
