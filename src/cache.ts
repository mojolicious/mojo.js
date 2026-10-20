/**
 * Cache class.
 */
export class Cache<T> {
  /**
   * Maximum number of values in cache, defaults to `100`.
   */
  max = 100;

  // Maps keep insertion order, so the first key is always the oldest
  _cache = new Map<string, T>();

  /**
   * Get cached value.
   */
  get(key: string): T | undefined {
    return this._cache.get(key);
  }

  /**
   * Add value to the cache.
   */
  set(key: string, value: T): void {
    const {max} = this;
    if (max <= 0) return;

    const cache = this._cache;
    while (cache.size >= max) cache.delete(cache.keys().next().value as string);
    if (cache.has(key) === false) cache.set(key, value);
  }

  /**
   * Current size of the cache.
   */
  get size(): number {
    return this._cache.size;
  }
}
