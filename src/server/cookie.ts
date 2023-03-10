import type {CookieOptions} from '../types.js';
import {decodeURIComponentSafe} from '@mojojs/util';

/**
 * Parse cookie.
 */
export function parseCookie(cookie: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const pair of cookie.split(/[,;]/)) {
    const match = pair.match(/^\s*([^=\s]+)\s*=\s*(\S+)\s*$/);
    if (match === null) continue;
    let value = match[2];
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    const decoded = decodeURIComponentSafe(value);
    if (decoded !== null) values[match[1]] = decoded;
  }

  return values;
}

/**
 * Stringify cookie.
 */
export function stringifyCookie(name: string, value: string, options: CookieOptions = {}): string {
  const cookie: string[] = [name + '=' + encodeURIComponent(value)];

  if (options.domain !== undefined) cookie.push(`Domain=${options.domain}`);
  if (options.expires !== undefined) cookie.push(`Expires=${options.expires.toUTCString()}`);
  if (options.httpOnly === true) cookie.push('HttpOnly');
  if (options.maxAge !== undefined) cookie.push(`Max-Age=${options.maxAge}`);
  if (options.path !== undefined) cookie.push(`Path=${options.path}`);

  const {sameSite} = options;
  if (sameSite !== undefined) {
    if (sameSite === 'lax') {
      cookie.push('SameSite=Lax');
    } else if (sameSite === 'strict') {
      cookie.push('SameSite=Strict');
    } else if (sameSite === 'none') {
      cookie.push('SameSite=None');
    }
  }

  if (options?.secure === true) cookie.push('Secure');

  return cookie.join('; ');
}
