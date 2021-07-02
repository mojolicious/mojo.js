import type {Router} from '../router.js';
import type {AnyArguments, MojoAction, MojoStash, RouteArguments} from '../types.js';
import {Pattern} from './pattern.js';

export class Route {
  children: Route[] = [];
  customName: string | undefined = undefined;
  defaultName: string | undefined = undefined;
  underRoute = false;
  methods: string[] = [];
  pattern: Pattern = new Pattern();
  requirements: MojoStash[] = [];
  websocketRoute = false;
  _parent: WeakRef<Route> | undefined = undefined;
  _root: WeakRef<Router> | undefined = undefined;

  addChild (child: Route): Route {
    this.children.push(child);
    child.parent = this;
    child.root = this.root;
    return child;
  }

  any (...args: AnyArguments): Route {
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
    childPattern.types = this.root?.types ?? {};

    return this.addChild(child);
  }

  delete (...args: RouteArguments): Route {
    return this.any(['DELETE'], ...args);
  }

  get (...args: RouteArguments): Route {
    return this.any(['GET'], ...args);
  }

  hasWebSocket (): boolean {
    return this._branch().map(route => route.websocketRoute).includes(true);
  }

  isEndpoint (): boolean {
    return this.children.length === 0;
  }

  name (name: string): this {
    this.customName = name;
    return this;
  }

  options (...args: RouteArguments): Route {
    return this.any(['OPTIONS'], ...args);
  }

  get parent (): Route | undefined {
    return this._parent?.deref();
  }

  set parent (parent: Route | undefined) {
    this._parent = parent === undefined ? undefined : new WeakRef(parent);
  }

  patch (...args: RouteArguments): Route {
    return this.any(['PATCH'], ...args);
  }

  post (...args: RouteArguments): Route {
    return this.any(['POST'], ...args);
  }

  put (...args: RouteArguments): Route {
    return this.any(['PUT'], ...args);
  }

  render (values = {}): string {
    const parts: string[] = [];
    const branch = this._branch();
    for (let i = 0; i < branch.length - 1; i++) {
      const route = branch[i];
      parts.push(route.pattern.render(values, {isEndpoint: route.isEndpoint()}));
    }
    return parts.reverse().join('');
  }

  requires (condition: string, requirement: MojoStash): this {
    const root = this.root;
    if (root === undefined) return this;

    if (this.requirements === undefined) this.requirements = [];
    this.requirements.push({condition, requirement});
    root.cache = null;

    return this;
  }

  get root (): Router | undefined {
    return this._root?.deref();
  }

  set root (root: Router | undefined) {
    this._root = root === undefined ? undefined : new WeakRef(root);
  }

  to (...targets: Array<string | MojoAction | MojoStash>): this {
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

  under (...args: AnyArguments): Route {
    const child = this.any(...args);
    child.underRoute = true;
    return child;
  }

  websocket (...args: RouteArguments): Route {
    const child = this.any(...args);
    child.websocketRoute = true;
    return child;
  }

  _branch (): Array<Router | Route> {
    const branch: Array<Router | Route> = [this];
    let current: Router | Route | undefined = branch[0];
    while ((current = current.parent) !== undefined) {
      branch.push(current);
    }
    return branch;
  }
}
