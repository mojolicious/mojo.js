import type {CookieOptions} from '../types.js';
import {decodeURIComponentSafe} from '../util.js';

export function parseCookie(cookie: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const pair of cookie.split(/[,;]/)) {
    const match = pair.match(/^\s*([^=\s]+)\s*=\s*(\S+)\s*$/);
    if (match === null) continue;
    let value = match[2];
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    values[match[1]] = decodeURIComponentSafe(value) ?? value;
  }

  return values;
}

export function stringifyCookie(name: string, value: string, options: CookieOptions = {}): string {
  let cookie = name + '=' + encodeURIComponent(value);

  if (options.domain !== undefined) cookie += `; Domain=${options.domain}`;
  if (options.expires !== undefined) cookie += `; Expires=${options.expires.toUTCString()}`;
  if (options.httpOnly === true) cookie += '; HttpOnly';
  if (options.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
  if (options.path !== undefined) cookie += `; Path=${options.path}`;

  const sameSite = options.sameSite;
  if (sameSite !== undefined) {
    if (sameSite === 'lax') {
      cookie += '; SameSite=Lax';
    } else if (sameSite === 'strict') {
      cookie += '; SameSite=Strict';
    } else if (sameSite === 'none') {
      cookie += '; SameSite=None';
    }
  }

  if (options?.secure === true) cookie += '; Secure';

  return cookie;
}
