import {URLSearchParams} from 'url';

/**
 * GET/POST parameter class.
 */
export class Params extends URLSearchParams {
  /**
   * Current number of parameters.
   */
  get size(): number {
    return [...this.keys()].length;
  }

  /**
   * Convert parameters into a plain object, useful for validation.
   */
  toObject(): Record<string, any> {
    return Object.fromEntries(this);
  }
}
