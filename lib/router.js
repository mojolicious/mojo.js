import File from './file.js';
import LRU from 'lru-cache';
import Plan from './router/plan.js';
import Route from './router/route.js';

export default class Router extends Route {
  constructor () {
    super();

    this.cache = new LRU(500);
    this.conditions = {};
    this.controllerPaths = [];
    this.controllers = {};
    this.root = new WeakRef(this);
    this.types = {num: /[0-9]+/};
    this._lookupIndex = undefined;
  }

  addCondition (name, fn) {
    this.conditions[name] = fn;
    return this;
  }

  addType (name, value) {
    this.types[name] = value;
    return this;
  }

  async dispatch (ctx) {
    const plan = this._getPlan(ctx);
    if (plan === null) return false;
    ctx.plan = plan;

    const stash = ctx.stash;
    const log = ctx.log;
    const steps = plan.steps;
    const stops = plan.stops;
    for (let i = 0; i < steps.length; i++) {
      Object.assign(stash, steps[i], {fn: undefined});
      if (stops[i] === false) continue;

      if (typeof steps[i].fn === 'function') {
        log.trace('Routing to function');
        if (await steps[i].fn(ctx) === false) break;
      } else if (stash.controller !== undefined && stash.action !== undefined) {
        const Controller = this.controllers[stash.controller];
        if (Controller === undefined) throw new Error(`Controller "${stash.controller}" does not exist`);

        const controller = new Controller();
        if (controller[stash.action] === undefined) throw new Error(`Action "${stash.action}" does not exist`);
        log.trace(`Routing to "${stash.controller}#${stash.action}"`);
        if (await controller[stash.action](ctx) === false) break;
      }
    }

    return true;
  }

  lookup (name) {
    if (this._lookupIndex === undefined) {
      const defaultNames = {};
      const customNames = {};
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

  plot (spec) {
    const plan = new Plan();
    const steps = plan.steps;
    const stops = plan.stops;

    for (const child of this.children) {
      if (this._walk(plan, child, spec) === true) break;
      steps.pop();
      stops.pop();
    }

    return plan.endpoint === undefined ? null : plan;
  }

  async warmup () {
    for (const dir of this.controllerPaths.map(path => new File(path))) {
      if (await dir.exists() === false) continue;
      for await (const file of dir.list({recursive: true})) {
        const imports = await import(file.toFileURL());
        const name = dir.relative(file).toArray().join('/').replace(/\.m?js$/, '');
        this.controllers[name] = imports.default || imports.Controller;
      }
    }
  }

  _getPlan (ctx) {
    const req = ctx.req;
    const realMethod = req.method;
    const method = realMethod === 'HEAD' ? 'GET' : realMethod;
    const path = req.path;
    if (path === null) return null;
    const isWebSocket = ctx.isWebSocket;
    ctx.log.trace(`${realMethod} "${path}"`);

    // Cache deactivated
    if (this.cache === null) return this.plot({ctx, method, path, websocket: isWebSocket});

    // Cached
    const cacheKey = `${method}:${path}:${isWebSocket}`;
    const cache = this.cache;
    const cachedPlan = cache.get(cacheKey);
    if (cachedPlan !== undefined) return cachedPlan;

    // Not yet cached
    const plan = this.plot({ctx, method, path, websocket: isWebSocket});
    if (plan === null) return null;
    cache.set(cacheKey, plan);
    return plan;
  }

  _walk (plan, route, spec) {
    // Path
    const isEndpoint = route.isEndpoint();
    const result = route.pattern.matchPartial(spec.path, {isEndpoint});
    const stops = plan.stops;
    stops.push(isEndpoint || route.underRoute);
    const steps = plan.steps;
    if (result === null) {
      steps.push(undefined);
      return false;
    }
    steps.push(result.captures);
    if (isEndpoint === true && result.remainder.length > 0 && result.remainder !== '/') return false;

    // Methods
    const methods = route.methods;
    if (methods.length > 0 && !methods.includes(spec.method)) return false;

    // WebSocket
    if (route.websocketRoute === true && spec.websocket === false) return false;

    // Conditions
    if (route.requirements !== undefined) {
      const conditions = route.root.deref().conditions;
      for (const value of route.requirements) {
        if (conditions[value.condition](spec.ctx, value.requirement) !== true) return false;
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
