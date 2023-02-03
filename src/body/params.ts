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

  /*
   * Create a new `Params` object with all empty values removed.
   */
  removeEmpty(): Params {
    const params = new Params();
    for (const [name, value] of this.entries()) {
      if (value !== '') params.append(name, value);
    }
    return params;
  }

  /**
   * Convert parameters into a plain object, useful for validation.
   */
  toObject<T extends Record<string, any>>(): T {
    return Object.fromEntries(this) as T;
  }
}
