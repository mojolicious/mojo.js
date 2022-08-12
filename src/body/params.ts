import {URLSearchParams} from 'node:url';

/**
 * GET/POST parameter class.
 */
export class Params extends URLSearchParams {
  /**
   * Convert parameters into a plain object, useful for validation.
   */
  toObject<T extends Record<string, any>>(): T {
    return Object.fromEntries(this) as T;
  }
}
