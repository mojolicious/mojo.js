/**
 * Cache class.
 */
export class Cache<T> {
  /**
   * Maximum number of values in cache, defaults to `100`.
   */
  max = 100;

  _cache: Record<string, T> = {};
  _queue: string[] = [];

  /**
   * Get cached value.
   */
  get(key: string): T | undefined {
    return this._cache[key];
  }

  /**
   * Add value to the cache.
   */
  set(key: string, value: T): void {
    const {max} = this;
    if (max <= 0) return;

    const cache = this._cache;
    const queue = this._queue;
    while (queue.length >= max) {
      const key = queue.shift();
      if (key !== undefined) delete cache[key];
    }

    if (cache[key] === undefined) {
      queue.push(key);
      cache[key] = value;
    }
  }

  /**
   * Current size of the cache.
   */
  get size(): number {
    return this._queue.length;
  }
}
