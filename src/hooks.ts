type Hook = (...args: any[]) => any;

/**
 * Hook class.
 */
export class Hooks {
  _hooks: Record<string, Hook[]> = {};

  /**
   * Add hook.
   */
  addHook(name: string, fn: Hook): void {
    if (this._hooks[name] === undefined) this._hooks[name] = [];
    this._hooks[name].push(fn);
  }

  /**
   * Run hook.
   */
  async runHook(name: string, ...args: any[]): Promise<any> {
    if (this._hooks[name] === undefined) return await Promise.resolve();
    return await this._prepareHook(this._hooks[name])(...args);
  }

  _prepareHook(chain: Hook[]) {
    return async function hook(...args: any[]): Promise<any> {
      return await next(0);

      async function next(i: number, result?: any): Promise<any> {
        const fn = chain[i];
        if (result !== undefined || fn === undefined) return result;
        return await new Promise(resolve => resolve(fn(...args))).then(next.bind(null, i + 1));
      }
    };
  }
}
