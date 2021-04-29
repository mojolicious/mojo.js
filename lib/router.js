import url from 'url';
import File from './file.js';
import Plan from './router/plan.js';
import Route from './router/route.js';

export default class Router extends Route {
  constructor () {
    super();
    this._lookupIndex = undefined;
    this.controllerPaths = [];
    this.controllers = {};
    this.types = {num: /[0-9]+/};
  }

  addType (name, value) {
    this.types[name] = value;
    return this;
  }

  async dispatch (ctx) {
    const method = ctx.req.method;
    // eslint-disable-next-line
    const path = url.parse(ctx.req.raw.url).pathname;

    const plan = this.plot({method: method === 'HEAD' ? 'GET' : method, path: path});
    if (plan === null) return false;

    for (let i = 0; i < plan.steps.length; i++) {
      Object.assign(ctx.stash, plan.steps[i]);
      if (!plan.stops[i]) continue;

      if (plan.steps[i].fn instanceof Function) {
        delete ctx.stash.fn;
        if (await plan.steps[i].fn(ctx) === false) break;
      } else if (ctx.stash.controller && ctx.stash.action) {
        const Controller = this.controllers[ctx.stash.controller];
        if (!Controller) throw new Error(`Controller "${ctx.stash.controller}" does not exist`);

        const controller = new Controller();
        if (!controller[ctx.stash.action]) throw new Error(`Action "${ctx.stash.action}" does not exist`);
        if (await controller[ctx.stash.action](ctx) === false) break;
      }
    }

    return true;
  }

  lookup (name) {
    if (!this._lookupIndex) {
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
      for await (const file of dir.list()) {
        const imports = await import(file.toString());
        this.controllers[file.basename('.js')] = imports.default || imports.Controller;
      }
    }
  }

  _walk (plan, route, spec) {
    // Path
    const isEndpoint = route.isEndpoint();
    const result = route.pattern.matchPartial(spec.path, {isEndpoint: isEndpoint});
    plan.stops.push(isEndpoint || route.underRoute);
    if (!result) {
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
