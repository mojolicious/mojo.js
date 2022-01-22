import type {MojoContext, PlaceholderType} from './types.js';
import {Plan} from './router/plan.js';
import {Route} from './router/route.js';
import * as util from './util.js';
import LRU from 'lru-cache';

type RouteIndex = Record<string, Route>;

interface RouteSpec {
  ctx?: MojoContext;
  method: string;
  path: string;
  websocket: boolean;
}

type RouteCondition = (ctx: MojoContext, requirements: any) => boolean;

const PLACEHOLDER = {};

export class Router extends Route {
  cache: LRU<string, Plan> | null = new LRU(500);
  conditions: Record<string, RouteCondition> = {};
  controllerPaths: string[] = [];
  controllers: Record<string, any> = {};
  types: Record<string, PlaceholderType> = {num: /[0-9]+/};
  _lookupIndex: RouteIndex | undefined = undefined;

  constructor() {
    super();
    this.root = this;
  }

  addCondition(name: string, fn: RouteCondition): this {
    this.conditions[name] = fn;
    return this;
  }

  addType(name: string, value: PlaceholderType): this {
    this.types[name] = value;
    return this;
  }

  async dispatch(ctx: MojoContext): Promise<boolean> {
    const plan = this._getPlan(ctx);
    if (plan === null) return false;
    ctx.plan = plan;

    const stash: Record<string, any> = ctx.stash;
    const log = ctx.log;
    const steps = plan.steps;
    const stops = plan.stops;
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

  lookup(name: string): Route | null {
    if (this._lookupIndex === undefined) {
      const defaultNames: RouteIndex = {};
      const customNames: RouteIndex = {};
      const children = [...this.children];
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.customName !== undefined && customNames[child.customName] === undefined) {
          customNames[child.customName] = child;
        } else if (child.defaultName !== undefined && defaultNames[child.defaultName] === undefined) {
          defaultNames[child.defaultName] = child;
        }
        children.push(...child.children);
      }
      this._lookupIndex = {...defaultNames, ...customNames};
    }

    return this._lookupIndex[name] === undefined ? null : this._lookupIndex[name];
  }

  plot(spec: RouteSpec): Plan | null {
    const plan = new Plan();
    const steps = plan.steps;
    const stops = plan.stops;

    for (const child of this.children) {
      if (this._walk(plan, child, spec)) break;
      steps.pop();
      stops.pop();
    }

    return plan.endpoint === undefined ? null : plan;
  }

  async warmup(): Promise<void> {
    Object.assign(this.controllers, await util.loadModules(this.controllerPaths));
  }

  _getPlan(ctx: MojoContext): Plan | null {
    const req = ctx.req;
    const realMethod = req.method;
    if (realMethod === null) return null;
    const method = realMethod === 'HEAD' ? 'GET' : realMethod;
    const path = req.path;
    if (path === null) return null;
    const isWebSocket = ctx.isWebSocket;
    ctx.log.trace(`${realMethod} "${path}"`);

    // Cache deactivated
    if (this.cache === null) return this.plot({ctx, method, path, websocket: isWebSocket});

    // Cached
    const cacheKey = `${method}:${path}:${isWebSocket.toString()}`;
    const cache = this.cache;
    const cachedPlan = cache.get(cacheKey);
    if (cachedPlan !== undefined) return cachedPlan;

    // Not yet cached
    const plan = this.plot({ctx, method, path, websocket: isWebSocket});
    if (plan === null) return null;
    cache.set(cacheKey, plan);
    return plan;
  }

  _walk(plan: Plan, route: Route, spec: RouteSpec): boolean {
    // Path
    const isEndpoint = route.isEndpoint();
    const result = route.pattern.matchPartial(spec.path, {isEndpoint});
    const stops = plan.stops;
    stops.push(isEndpoint || route.underRoute);
    const steps = plan.steps;
    if (result === null) {
      steps.push(PLACEHOLDER);
      return false;
    }
    steps.push(result.captures);
    if (isEndpoint && result.remainder.length > 0 && result.remainder !== '/') return false;

    // Methods
    const methods = route.methods;
    if (methods.length > 0 && !methods.includes(spec.method)) return false;

    // WebSocket
    if (route.websocketRoute && !spec.websocket) return false;

    // Conditions
    if (route.requirements !== undefined) {
      const root = route.root;
      if (root === undefined) return false;
      const conditions = root.conditions;
      for (const value of route.requirements) {
        if (spec.ctx === undefined || !conditions[value.condition](spec.ctx, value.requirement)) return false;
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
      if (this._walk(plan, child, spec) === true) return true;
      spec.path = old;
      steps.pop();
      stops.pop();
    }

    return false;
  }
}
