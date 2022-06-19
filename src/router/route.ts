import type {Router} from '../router.js';
import type {AnyArguments, MojoAction, RouteArguments} from '../types.js';
import {Pattern} from './pattern.js';

/**
 * Route class.
 */
export class Route {
  /**
   * The children of this route, used for nesting routes.
   */
  children: Route[] = [];
  /**
   * Custom route name, if defined.
   */
  customName: string | undefined = undefined;
  /**
   * Default route name.
   */
  defaultName: string | undefined = undefined;
  /**
   * Allow `under` semantics for this route.
   */
  underRoute = false;
  /**
   * Restrict HTTP methods this route is allowed to handle, defaults to no restrictions.
   */
  methods: string[] = [];
  /**
   * Pattern for this route.
   */
  pattern: Pattern = new Pattern();
  /**
   * Activate conditions for this route.
   */
  requirements: Array<Record<string, any>> = [];
  /**
   * Activate `websocket` semantics for this route.
   */
  websocketRoute = false;

  _parent: WeakRef<Route> | undefined = undefined;
  _root: WeakRef<Router> | undefined = undefined;

  /**
   * Add a child to this route.
   */
  addChild(child: Route): Route {
    this.children.push(child);
    child.remove().parent = this;
    child.root = this.root;
    return child;
  }

  /**
   * Generate route matching any of the listed HTTP request methods or all.
   */
  any(...args: AnyArguments): Route {
    const child = new Route();

    const childPattern = child.pattern;
    for (const arg of args) {
      if (typeof arg === 'string') {
        child.defaultName = arg.replace(/[^0-9a-z]+/gi, '_').replace(/^_|_$/g, '');
        childPattern.parse(arg);
      } else if (Array.isArray(arg)) {
        child.methods = arg;
      } else if (typeof arg === 'function') {
        childPattern.defaults.fn = arg;
      } else if (typeof arg === 'object' && arg !== null) {
        Object.assign(childPattern.constraints, arg);
      }
    }
    childPattern.types = this.root?.types ?? {};

    return this.addChild(child);
  }

  /**
   * Generate route matching only `DELETE` requests.
   */
  delete(...args: RouteArguments): Route {
    return this.any(['DELETE'], ...args);
  }

  /**
   * Generate route matching only `GET` requests.
   */
  get(...args: RouteArguments): Route {
    return this.any(['GET'], ...args);
  }

  /**
   * Check if this route has a WebSocket ancestor and cache the result for future checks.
   */
  hasWebSocket(): boolean {
    return this._branch()
      .map(route => route.websocketRoute)
      .includes(true);
  }

  /**
   * Check if this route qualifies as an endpoint.
   */
  isEndpoint(): boolean {
    return this.children.length === 0;
  }

  /**
   * The name of this route, defaults to an automatically generated name based on the route pattern. Note that the name
   * `current` is reserved for referring to the current route.
   */
  name(name: string): this {
    this.customName = name;
    return this;
  }

  /**
   * Generate route matching only `OPTIONS` requests.
   */
  options(...args: RouteArguments): Route {
    return this.any(['OPTIONS'], ...args);
  }

  /**
   * The parent of this route.
   */
  get parent(): Route | undefined {
    return this._parent?.deref();
  }

  set parent(parent: Route | undefined) {
    this._parent = parent === undefined ? undefined : new WeakRef(parent);
  }

  /**
   * Generate route matching only `PATCH` requests.
   */
  patch(...args: RouteArguments): Route {
    return this.any(['PATCH'], ...args);
  }

  /**
   * Generate route matching only `POST` requests.
   */
  post(...args: RouteArguments): Route {
    return this.any(['POST'], ...args);
  }

  /**
   * Generate route matching only `PUT` requests.
   */
  put(...args: RouteArguments): Route {
    return this.any(['PUT'], ...args);
  }

  /**
   * Remove route from parent.
   */
  remove(): this {
    const parent = this.parent;
    if (parent === undefined) return this;
    this.parent = undefined;
    parent.children = parent.children.filter(route => route !== this);
    return this;
  }

  /**
   * Render route with parameters into a path.
   */
  render(values = {}): string {
    const parts: string[] = [];
    const branch = this._branch();
    for (let i = 0; i < branch.length - 1; i++) {
      const route = branch[i];
      parts.push(route.pattern.render(values, {isEndpoint: route.isEndpoint()}));
    }
    return parts.reverse().join('');
  }

  /**
   * Activate conditions for this route. Note that this automatically disables the routing cache, since conditions are
   * too complex for caching.
   */
  requires(condition: string, requirement: Record<string, any>): this {
    const root = this.root;
    if (root === undefined) return this;

    this.requirements.push({condition, requirement});
    root.cache = null;

    return this;
  }

  /**
   * Return the `Router` object this route is a descendant of.
   */
  get root(): Router | undefined {
    return this._root?.deref();
  }

  set root(root: Router | undefined) {
    this._root = root === undefined ? undefined : new WeakRef(root);
  }

  /**
   * Set default parameters for this route.
   */
  to(...targets: Array<string | MojoAction | Record<string, any>>): this {
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

  /**
   * Generate route for a nested route with its own intermediate destination.
   */
  under(...args: AnyArguments): Route {
    const child = this.any(...args);
    child.underRoute = true;
    return child;
  }

  /**
   * Generate route matching only WebSocket handshake requests.
   */
  websocket(...args: RouteArguments): Route {
    const child = this.any(...args);
    child.websocketRoute = true;
    return child;
  }

  _branch(): Array<Router | Route> {
    const branch: Array<Router | Route> = [this];
    let current: Router | Route | undefined = branch[0];
    while ((current = current.parent) !== undefined) {
      branch.push(current);
    }
    return branch;
  }
}
