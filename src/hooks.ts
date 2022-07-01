import type {MojoApp} from './types.js';
type Hook = (...args: any[]) => any;

/**
 * Hook class.
 */
export class Hooks {
  _hooks: Record<string, Hook[]> = {};
  _lifecycleHookScore = 0;

  /**
   * Add hook.
   */
  addHook(name: string, fn: Hook): void {
    if (this._hooks[name] === undefined) this._hooks[name] = [];
    this._hooks[name].push(fn);
  }

  /**
   * Run `command:start` hook with dependencies. Note that this method is EXPERIMENTAL and might change without
   * warning!
   */
  async commandBefore(app: MojoApp, commandArgs: string[]): Promise<any> {
    const result = await this.runHook('command:before', app, commandArgs);
    await this._appStart(app);
    return result;
  }

  /**
   * Run `command:stop` hook with dependencies. Note that this method is EXPERIMENTAL and might change without
   * warning!
   */
  async commandAfter(app: MojoApp, commandArgs: string[]): Promise<void> {
    await this.runHook('command:after', app, commandArgs);
    await this._appStop(app);
  }

  /**
   * Run hook.
   */
  async runHook(name: string, ...args: any[]): Promise<any> {
    if (this._hooks[name] === undefined) return await Promise.resolve();
    return await this._prepareHook(this._hooks[name])(...args);
  }

  /**
   * Run `server:start` hook with dependencies. Note that this method is EXPERIMENTAL and might change without warning!
   */
  async serverStart(app: MojoApp): Promise<void> {
    await this.runHook('server:start', app);
    await this._appStart(app);
  }

  /**
   * Run `server:stop` hook with dependencies. Note that this method is EXPERIMENTAL and might change without warning!
   */
  async serverStop(app: MojoApp): Promise<void> {
    await this.runHook('server:stop', app);
    await this._appStop(app);
  }

  async _appStart(app: MojoApp): Promise<void> {
    if (this._lifecycleHookScore === 0) await this.runHook('app:start', app);
    this._lifecycleHookScore++;
  }

  async _appStop(app: MojoApp): Promise<void> {
    this._lifecycleHookScore--;
    if (this._lifecycleHookScore === 0) await this.runHook('app:stop', app);
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
