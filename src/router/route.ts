import {AnyArguments, RouteArguments} from '../types.js';
import assert from 'assert';
import Pattern from './pattern.js';
import Router from '../router.js';

export default class Route {
  children: Route[] = [];
  customName: string = undefined;
  defaultName: string = undefined;
  underRoute: boolean = false;
  methods: string[] = [];
  pattern: Pattern = new Pattern();
  requirements: {[name: string]: any}[] = [];
  websocketRoute: boolean = false;
  _parent: WeakRef<Route> = undefined;
  _root: WeakRef<Router> = undefined;

  addChild (child: Route) {
    this.children.push(child);
    child.parent = this;
    child.root = this.root;
    return child;
  }

  any (...args: AnyArguments) {
    const child = new Route();

    const childPattern = child.pattern;
    for (const arg of args) {
      if (typeof arg === 'string') {
        child.defaultName = arg.replace(/[^0-9a-z]+/gi, '_').replace(/^_|_$/g, '');
        childPattern.parse(arg);
      } else if (arg instanceof Array) {
        child.methods = arg;
      } else if (typeof arg === 'function') {
        childPattern.defaults.fn = arg;
      } else if (typeof arg === 'object') {
        Object.assign(childPattern.constraints, arg);
      }
    }
    childPattern.types = this.root.types;

    return this.addChild(child);
  }

  delete (...args: RouteArguments) {
    return this.any(['DELETE'], ...args);
  }

  get (...args: RouteArguments) {
    return this.any(['GET'], ...args);
  }

  hasWebSocket () {
    return this._branch().map(route => route.websocketRoute).includes(true);
  }

  isEndpoint () {
    return this.children.length === 0;
  }

  name (name: string) {
    this.customName = name;
    return this;
  }

  options (...args: RouteArguments) {
    return this.any(['OPTIONS'], ...args);
  }

  get parent () {
    return this._parent?.deref();
  }

  set parent (parent: Route) {
    this._parent = new WeakRef(parent);
  }

  patch (...args: RouteArguments) {
    return this.any(['PATCH'], ...args);
  }

  post (...args: RouteArguments) {
    return this.any(['POST'], ...args);
  }

  put (...args: RouteArguments) {
    return this.any(['PUT'], ...args);
  }

  render (values = {}) {
    const parts = [];
    const branch = this._branch();
    for (let i = 0; i < branch.length - 1; i++) {
      const route = branch[i];
      parts.push(route.pattern.render(values, {isEndpoint: route.isEndpoint()}));
    }
    return parts.reverse().join('');
  }

  requires (condition, requirement) {
    const root = this.root;
    assert(root.conditions[condition], 'Invalid condition');

    if (this.requirements === undefined) this.requirements = [];
    this.requirements.push({condition, requirement});
    root.cache = null;

    return this;
  }

  get root () {
    return this._root?.deref();
  }

  set root (root: Router) {
    this._root = new WeakRef(root);
  }

  to (...targets: (string | Function | {})[]) {
    const defaults = this.pattern.defaults;

    for (const target of targets) {
      if (typeof target === 'string') {
        const parts = target.split('#');
        if (parts[0] !== '') defaults.controller = parts[0];
        if (parts.length > 1 && parts[1] !== '') defaults.action = parts[1];
      } else if (typeof target === 'function') {
        defaults.fn = target;
      } else {
        Object.assign(defaults, target);
      }
    }

    return this;
  }

  under (...args: AnyArguments) {
    const child = this.any(...args);
    child.underRoute = true;
    return child;
  }

  websocket (...args: RouteArguments) {
    const child = this.any(...args);
    child.websocketRoute = true;
    return child;
  }

  _branch () {
    let current: Route | Router = this;
    const branch = [current];
    while ((current = current.parent) !== undefined) {
      branch.push(current);
    }
    return branch;
  }
}
