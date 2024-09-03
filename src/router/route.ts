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
  requirements: Record<string, any>[] = [];
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
   * @example
   * // Route with pattern and destination
   * route.any('/user').to('User#whatever');
   *
   * // Route with HTTP methods, pattern, restrictive placeholders and destination
   * route.any(['DELETE', 'PUT'], '/:foo', {foo: /\w+/}).to('Foo#bar');
   *
   * // Route with pattern, name and destination
   * route.any('/:foo').name('foo_route').to('Foo#bar');
   *
   * // Route with pattern, condition and destination
   * route.any('/').requires({agent: /Firefox/}).to('Foo#bar');
   *
   * // Route with pattern and a closure as destination
   * route.any('/:foo', async ctx => ctx.render({text: 'Hello World!'}));
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
   * @example
   * // Route with destination
   * route.delete('/user').to('User#remove');
   */
  delete(...args: RouteArguments): Route {
    return this.any(['DELETE'], ...args);
  }

  /**
   * Generate route matching only `GET` requests.
   * @example
   * // Route with destination
   * route.get('/user').to('User#show');
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
   * @example
   * // Route with destination
   * route.options('/user').to('User#overview');
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
   * @example
   * // Route with destination
   * route.patch('/user').to('User#update');
   */
  patch(...args: RouteArguments): Route {
    return this.any(['PATCH'], ...args);
  }

  /**
   * Generate route matching only `POST` requests.
   * @example
   * // Route with destination
   * route.post('/user').to('User#create');
   */
  post(...args: RouteArguments): Route {
    return this.any(['POST'], ...args);
  }

  /**
   * Generate route matching only `PUT` requests.
   * @example
   * // Route with destination
   * route.put('/user').to('User#replace');
   */
  put(...args: RouteArguments): Route {
    return this.any(['PUT'], ...args);
  }

  /**
   * Remove route from parent.
   */
  remove(): this {
    const {parent} = this;
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
    const {root} = this;
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
   * Suggested HTTP method for reaching this route, `GET` and `POST` are preferred.
   */
  suggestedMethod(): string {
    const suggestions: string[] = [];
    for (const route of this._branch()) {
      const {methods} = route;
      if (methods.length <= 0) continue;
      suggestions.push(...(suggestions.length > 0 ? suggestions.filter(method => methods.includes(method)) : methods));
    }

    const hasGet = suggestions.includes('GET');
    if (suggestions.includes('POST') === true && hasGet === false) return 'POST';
    return hasGet === true ? 'GET' : (suggestions[0] ?? 'GET');
  }

  /**
   * Set default parameters for this route.
   */
  to(...targets: (string | MojoAction | Record<string, any>)[]): this {
    const {defaults} = this.pattern;

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
   * @example
   * // Intermediate destination and prefix shared between two routes
   * const auth = app.under('/user').to('User#auth');
   * auth.get('/show').to('User#show');
   * auth.post('/create').to('User#create');
   */
  under(...args: AnyArguments): Route {
    const child = this.any(...args);
    child.underRoute = true;
    return child;
  }

  /**
   * Generate route matching only WebSocket handshake requests.
   * @example
   * // Route with destination
   * app.websocket('/echo').to('Example#echo');
   */
  websocket(...args: RouteArguments): Route {
    const child = this.any(...args);
    child.websocketRoute = true;
    return child;
  }

  _branch(): (Router | Route)[] {
    const branch: (Router | Route)[] = [this];
    let current: Router | Route | undefined = branch[0];
    while ((current = current.parent) !== undefined) {
      branch.push(current);
    }
    return branch;
  }
}
