import File from './file.js';
import LRU from 'lru-cache';
import Plan from './router/plan.js';
import Route from './router/route.js';

export default class Router extends Route {
  constructor () {
    super();
    this.cache = new LRU(500);
    this.controllerPaths = [];
    this.controllers = {};
    this.types = {num: /[0-9]+/};
    this._lookupIndex = undefined;
  }

  addType (name, value) {
    this.types[name] = value;
    return this;
  }

  async dispatch (ctx) {
    const method = ctx.req.method;
    const path = ctx.req.path;
    if (path === null) return false;
    const isWebSocket = ctx.isWebSocket;

    const cacheKey = `${method}:${path}:${isWebSocket}`;
    let plan = ctx.plan = this.cache.get(cacheKey);
    if (plan === undefined) {
      plan = ctx.plan = this.plot({method: method === 'HEAD' ? 'GET' : method, path, websocket: isWebSocket});
      if (plan === null) return false;
      this.cache.set(cacheKey, plan);
    }

    for (let i = 0; i < plan.steps.length; i++) {
      Object.assign(ctx.stash, plan.steps[i], {fn: undefined});
      if (plan.stops[i] === false) continue;

      if (typeof plan.steps[i].fn === 'function') {
        if (await plan.steps[i].fn(ctx) === false) break;
      } else if (ctx.stash.controller !== undefined && ctx.stash.action !== undefined) {
        const Controller = this.controllers[ctx.stash.controller];
        if (Controller === undefined) throw new Error(`Controller "${ctx.stash.controller}" does not exist`);

        const controller = new Controller();
        if (controller[ctx.stash.action] === undefined) throw new Error(`Action "${ctx.stash.action}" does not exist`);
        if (await controller[ctx.stash.action](ctx) === false) break;
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
    for (const child of this.children) {
      if (this._walk(plan, child, spec)) break;
      plan.steps.pop();
      plan.stops.pop();
    }
    return plan.endpoint === undefined ? null : plan;
  }

  async warmup () {
    for (const dir of this.controllerPaths.map(path => new File(path))) {
      if (!(await dir.exists())) continue;
      for await (const file of dir.list({recursive: true})) {
        const imports = await import(file.toFileURL());
        const name = dir.relative(file).toArray().join('/').replace(/\.m?js$/, '');
        this.controllers[name] = imports.default || imports.Controller;
      }
    }
  }

  _walk (plan, route, spec) {
    // Path
    const isEndpoint = route.isEndpoint();
    const result = route.pattern.matchPartial(spec.path, {isEndpoint});
    plan.stops.push(isEndpoint || route.underRoute);
    if (result === null) {
      plan.steps.push(undefined);
      return false;
    }
    plan.steps.push(result.captures);
    if (isEndpoint && result.remainder.length && result.remainder !== '/') return false;

    // Methods
    if (route.methods.length > 0 && !route.methods.includes(spec.method)) return false;

    // WebSocket
    if (route.websocketRoute && !spec.websocket) return false;

    // Endpoint
    if (isEndpoint) {
      plan.endpoint = route;
      return true;
    }

    // Children
    for (const child of route.children) {
      const old = spec.path;
      spec.path = result.remainder;
      if (this._walk(plan, child, spec)) return true;
      spec.path = old;
      plan.steps.pop();
      plan.stops.pop();
    }

    return false;
  }
}
