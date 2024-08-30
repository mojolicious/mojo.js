import type {MojoContext, PlaceholderType} from './types.js';
import {Cache} from './cache.js';
import {Plan} from './router/plan.js';
import {Route} from './router/route.js';
import * as util from './util.js';

type RouteIndex = Record<string, Route>;

interface RouteSpec {
  ctx?: MojoContext;
  method: string;
  path: string;
  websocket: boolean;
}

type RouteCondition = (ctx: MojoContext, requirements: any) => Promise<boolean>;

const PLACEHOLDER = {};

/**
 * Router class.
 */
export class Router extends Route {
  /**
   * Routing cache.
   */
  cache: Cache<Plan> | null = new Cache();
  /**
   * Contains all available conditions.
   */
  conditions: Record<string, RouteCondition> = {};
  /**
   * Directories to look for controllers in, first one has the highest precedence.
   */
  controllerPaths: string[] = [];
  /**
   * Already loaded controllers.
   */
  controllers: Record<string, any> = {};
  /**
   * Registered placeholder types, by default only `num` is already defined.
   */
  types: Record<string, PlaceholderType> = {num: /[0-9]+/};

  _lookupIndex: RouteIndex | undefined = undefined;

  constructor() {
    super();
    this.root = this;
  }

  /**
   * Register a condition.
   */
  addCondition(name: string, fn: RouteCondition): this {
    this.conditions[name] = fn;
    return this;
  }

  /**
   * Register a placeholder type.
   */
  addType(name: string, value: PlaceholderType): this {
    this.types[name] = value;
    return this;
  }

  /**
   * Match routes and dispatch to actions with and without controllers.
   */
  async dispatch(ctx: MojoContext): Promise<boolean> {
    const plan = await this._getPlan(ctx);
    if (plan === null) return false;
    ctx.plan = plan;

    const {log, stash} = ctx;
    const {steps, stops} = plan;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      Object.assign(stash, step, {fn: undefined});
      if (stops[i] === false) continue;

      if (typeof step.fn === 'function') {
        log.trace('Routing to function');
        if ((await step.fn(ctx)) === false) break;
      } else if (typeof stash.controller === 'string' && typeof stash.action === 'string') {
        const controller: string = stash.controller;
        const action: string = stash.action;

        const Controller = this.controllers[controller];
        if (Controller == null) {
          if (Controller === null) throw new Error(`Controller "${controller}" does not have a default export`);
          throw new Error(`Controller "${controller}" does not exist`);
        }

        const instance = new Controller();
        if (instance[action] === undefined) throw new Error(`Action "${action}" does not exist`);
        log.trace(`Routing to "${controller}#${action}"`);
        if ((await instance[action](ctx)) === false) break;
      }
    }

    return true;
  }

  /**
   * Find child route by name, custom names have precedence over automatically generated ones.
   */
  find(name: string): Route | null {
    return this._getLookupIndex()[name] ?? null;
  }

  /**
   * Find route by name and cache all results for future lookups.
   */
  lookup(name: string): Route | null {
    if (this._lookupIndex === undefined) this._lookupIndex = this._getLookupIndex();
    return this._lookupIndex[name] ?? null;
  }

  /**
   * Plot a route.
   */
  async plot(spec: RouteSpec): Promise<Plan | null> {
    const plan = new Plan();
    const {steps, stops} = plan;

    for (const child of this.children) {
      if (await this._walk(plan, child, spec)) break;
      steps.pop();
      stops.pop();
    }

    return plan.endpoint === undefined ? null : plan;
  }

  /**
   * Prepare controllers for routing.
   */
  async warmup(): Promise<void> {
    Object.assign(this.controllers, await util.loadModules(this.controllerPaths));
  }

  async _getPlan(ctx: MojoContext): Promise<Plan | null> {
    const {req} = ctx;
    const realMethod = req.method;
    if (realMethod === null) return null;
    let method = realMethod;

    if (realMethod === 'POST') {
      const params = req.query;
      const override = params.get('_method');
      if (override !== null) method = override.toUpperCase();
    }
    if (method === 'HEAD') method = 'GET';

    const {path} = req;
    const {isWebSocket} = ctx;
    ctx.log.trace(`${realMethod} "${path}"`);

    // Cache deactivated
    if (this.cache === null) return await this.plot({ctx, method, path, websocket: isWebSocket});

    // Cached
    const cacheKey = `${method}:${path}:${isWebSocket.toString()}`;
    const {cache} = this;
    const cachedPlan = cache.get(cacheKey);
    if (cachedPlan !== undefined) return cachedPlan;

    // Not yet cached
    const plan = await this.plot({ctx, method, path, websocket: isWebSocket});
    if (plan === null) return null;
    cache.set(cacheKey, plan);
    return plan;
  }

  _getLookupIndex(): RouteIndex {
    const defaultNames: RouteIndex = {};
    const customNames: RouteIndex = {};

    const children = [...this.children];
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.customName !== undefined && customNames[child.customName] === undefined) {
        customNames[child.customName] = child;
      } else if (child.defaultName !== undefined && defaultNames[child.defaultName] === undefined) {
        defaultNames[child.defaultName] = child;
      }
      children.push(...child.children);
    }

    return {...defaultNames, ...customNames};
  }

  async _walk(plan: Plan, route: Route, spec: RouteSpec): Promise<boolean> {
    // Path
    const isEndpoint = route.isEndpoint();
    const result = route.pattern.matchPartial(spec.path, {isEndpoint});
    const {steps, stops} = plan;
    stops.push(isEndpoint || route.underRoute);
    if (result === null) {
      steps.push(PLACEHOLDER);
      return false;
    }
    steps.push(result.captures);
    if (isEndpoint && result.remainder.length > 0 && result.remainder !== '/') return false;

    // Methods
    const {methods} = route;
    if (methods.length > 0 && !methods.includes(spec.method)) return false;

    // WebSocket
    if (route.websocketRoute && !spec.websocket) return false;

    // Conditions
    if (route.requirements !== undefined) {
      const {root} = route;
      if (root === undefined) return false;
      const conditions = root.conditions;
      for (const value of route.requirements) {
        if (spec.ctx === undefined || (await conditions[value.condition](spec.ctx, value.requirement)) === false) {
          return false;
        }
      }
    }

    // Endpoint
    if (isEndpoint === true) {
      plan.endpoint = route;
      return true;
    }

    // Children
    for (const child of route.children) {
      const old = spec.path;
      spec.path = result.remainder;
      if ((await this._walk(plan, child, spec)) === true) return true;
      spec.path = old;
      steps.pop();
      stops.pop();
    }

    return false;
  }
}
