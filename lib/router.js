'use strict';

import Plan from './router/plan.js';
import Route from './router/route.js';

export default class Router extends Route {
  constructor () {
    super();
    this._index = undefined;
    this.types = {num: /[0-9]+/};
  }

  addType (name, value) {
    this.types[name] = value;
    return this;
  }

  dispatch (ctx) {
    const method = ctx.req.raw.method;
    const path = ctx.req.raw.url;

    const plan = this.plot({method: method, path: path});
    if (plan === null) {
      ctx.helpers.not_found();
      return;
    }

    const merged = plan.steps.reduce((result, current) => Object.assign(result, current), {});
    if (merged.fn instanceof Function) {
      const fn = merged.fn;
      delete merged.fn;
      Object.assign(ctx.stash, merged);
      fn(ctx);
    } else {
      ctx.helpers.not_found();
    }
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

  lookup (name) {
    if (!this._index) {
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
      this._index = {...defaultNames, ...customNames};
    }

    return this._index[name] === undefined ? null : this._index[name];
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
