import {URLSearchParams} from 'url';

/**
 * GET/POST parameter class.
 */
export class Params extends URLSearchParams {
  /**
   * Convert parameters into a plain object, useful for validation.
   */
  toObject(): Record<string, string> {
    return Object.fromEntries(this);
  }
}
