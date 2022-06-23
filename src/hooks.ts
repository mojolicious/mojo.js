import type {MojoApp} from './types.js';
type Hook = (...args: any[]) => any;

/**
 * Hook class.
 */
export class Hooks {
  _expectedHookName: string | undefined = undefined;
  _hooks: Record<string, Hook[]> = {};

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
  async commandBefore(app: MojoApp, commandArgs: string[]): Promise<void> {
    await this.runHook('command:before', app, commandArgs);
    await this._appStart('command:after', app);
  }

  /**
   * Run `command:stop` hook with dependencies. Note that this method is EXPERIMENTAL and might change without
   * warning!
   */
  async commandAfter(app: MojoApp, commandArgs: string[]): Promise<void> {
    await this.runHook('command:after', app, commandArgs);
    await this._appStop('command:after', app);
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
    await this._appStart('server:stop', app);
  }

  /**
   * Run `server:stop` hook with dependencies. Note that this method is EXPERIMENTAL and might change without warning!
   */
  async serverStop(app: MojoApp): Promise<void> {
    await this.runHook('server:stop', app);
    await this._appStop('server:stop', app);
  }

  async _appStart(expectedHookName: string, app: MojoApp): Promise<void> {
    if (this._expectedHookName !== undefined) return;
    await this.runHook('app:start', app);
    this._expectedHookName = expectedHookName;
  }

  async _appStop(hookName: string, app: MojoApp): Promise<void> {
    if (this._expectedHookName !== hookName) return;
    await this.runHook('app:stop', app);
    this._expectedHookName = undefined;
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
