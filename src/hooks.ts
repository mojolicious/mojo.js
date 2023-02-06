import type {MojoApp} from './types.js';
import {AsyncHooks} from '@mojojs/util';

/**
 * Hook class.
 */
export class Hooks extends AsyncHooks {
  _lifecycleHookScore = 0;

  /**
   * Run `command:before` hook with dependencies. Note that this method is EXPERIMENTAL and might change without
   * warning!
   */
  async commandBefore(app: MojoApp, commandArgs: string[]): Promise<any> {
    const result = await this.runHook('command:before', app, commandArgs);
    await this._appStart(app);
    return result;
  }

  /**
   * Run `command:after` hook with dependencies. Note that this method is EXPERIMENTAL and might change without
   * warning!
   */
  async commandAfter(app: MojoApp, commandArgs: string[]): Promise<void> {
    await this.runHook('command:after', app, commandArgs);
    await this._appStop(app);
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
}
