import {URLSearchParams} from 'node:url';

/**
 * GET/POST parameter class.
 */
export class Params extends URLSearchParams {
  /**
   * Check if parameters are empty.
   */
  get isEmpty(): boolean {
    return [...this].length === 0;
  }

  /**
   * Convert parameters into a plain object, useful for validation.
   */
  toObject<T extends Record<string, any>>(): T {
    return Object.fromEntries(this) as T;
  }
}
