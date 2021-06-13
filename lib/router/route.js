import assert from 'assert';
import Pattern from './pattern.js';

/** Class representing a route. */
export default class Route {
  constructor () {
    this.children = [];
    this.customName = undefined;
    this.defaultName = undefined;
    this.underRoute = false;
    this.methods = [];
    this.pattern = new Pattern();
    this.requirements = undefined;
    this.websocketRoute = false;

    this._parent = undefined;
    this._root = undefined;
  }

  addChild (child) {
    this.children.push(child);
    child.parent = this;
    child.root = this.root;
    return child;
  }

  /** Create a route.
   * @param {string[]|string|actionCallback} [methods] - Request methods.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns {Route} A new route.
   * @example
   *   // Route to controller
   *   route.any('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   route.any('/:name', ctx => ctx.render({text: ctx.stash.name}));
   *
   *   // Route with everything
   *   route.any(['PUT', 'PATCH'], '/:name', {name: /[a-z]+/}, ctx => ctx.render({text: ctx.stash.name}));
   */
  any (methods, pattern, constraints, fn) {
    const child = new Route();

    const childPattern = child.pattern;
    for (const arg of [methods, pattern, constraints, fn]) {
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

  /** Create a DELETE route.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns {Route} A new route.
   * @example
   *   // Route to controller
   *   route.delete('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   route.delete('/:id', ctx => ctx.render({text: ctx.stash.id}));
   *
   *   // Route with everything
   *   route.delete('/:id', {id: /\d+/}, ctx => ctx.render({text: ctx.stash.id}));
   */
  delete (pattern, constraints, fn) {
    return this.any(['DELETE'], pattern, constraints, fn);
  }

  /** Create a GET route.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns {Route} A new route.
   * @example
   *   // Route to controller
   *   route.get('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   route.get('/:id', ctx => ctx.render({text: ctx.stash.id}));
   *
   *   // Route with everything
   *   route.get('/:id', {id: /\d+/}, ctx => ctx.render({text: ctx.stash.id}));
   */
  get (pattern, constraints, fn) {
    return this.any(['GET'], pattern, constraints, fn);
  }

  hasWebSocket () {
    return this._branch().map(route => route.websocketRoute).includes(true);
  }

  isEndpoint () {
    return this.children.length === 0;
  }

  name (name) {
    this.customName = name;
    return this;
  }

  /** Create a OPTIONS route.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns {Route} A new route.
   * @example
   *   // Route to controller
   *   route.options('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   route.options('/:id', ctx => ctx.render({text: ctx.stash.id}));
   *
   *   // Route with everything
   *   route.options('/:id', {id: /\d+/}, ctx => ctx.render({text: ctx.stash.id}));
   */
  options (pattern, constraints, fn) {
    return this.any(['OPTIONS'], pattern, constraints, fn);
  }

  get parent () {
    return this._parent?.deref();
  }

  set parent (parent) {
    this._parent = new WeakRef(parent);
  }

  /** Create a PATCH route.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns {Route} A new route.
   * @example
   *   // Route to controller
   *   route.patch('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   route.patch('/:id', ctx => ctx.render({text: ctx.stash.id}));
   *
   *   // Route with everything
   *   route.patch('/:id', {id: /\d+/}, ctx => ctx.render({text: ctx.stash.id}));
   */
  patch (pattern, constraints, fn) {
    return this.any(['PATCH'], pattern, constraints, fn);
  }

  /** Create a POST route.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns {Route} A new route.
   * @example
   *   // Route to controller
   *   route.ppost('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   route.post('/:id', ctx => ctx.render({text: ctx.stash.id}));
   *
   *   // Route with everything
   *   route.post('/:id', {id: /\d+/}, ctx => ctx.render({text: ctx.stash.id}));
   */
  post (pattern, constraints, fn) {
    return this.any(['POST'], pattern, constraints, fn);
  }

  /** Create a PUT route.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns {Route} A new route.
   * @example
   *   // Route to controller
   *   route.put('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   route.put('/:id', ctx => ctx.render({text: ctx.stash.id}));
   *
   *   // Route with everything
   *   route.put('/:id', {id: /\d+/}, ctx => ctx.render({text: ctx.stash.id}));
   */
  put (pattern, constraints, fn) {
    return this.any(['PUT'], pattern, constraints, fn);
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

  set root (root) {
    this._root = new WeakRef(root);
  }

  to (...args) {
    const defaults = this.pattern.defaults;

    for (const target of args) {
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

  /** Create an under route.
   * @param {string[]|string|actionCallback} [methods] - Request methods.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns {Route} A new route.
   * @example
   *   // Route to controller
   *   const foo = route.under('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   const withId = route.under('/:id', ctx => {...});
   *
   *   // Route with everything
   *   const withId = route.under(['PUT', 'PATCH'], '/:id', {id: /\d+/}, ctx => {...});
   */
  under (methods, pattern, constraints, fn) {
    const child = this.any(methods, pattern, constraints, fn);
    child.underRoute = true;
    return child;
  }

  /** Create a WebSocket route.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns {Route} A new route.
   * @example
   *   // Route to controller
   *   route.websocket('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   route.websocket('/:prefix', ctx => {...});
   *
   *   // Route with everything
   *   route.websocket('/:id', {id: /\d+/}, ctx => {...});
   */
  websocket (pattern, constraints, fn) {
    const child = this.any(pattern, constraints, fn);
    child.websocketRoute = true;
    return child;
  }

  _branch () {
    let current = this;
    const branch = [current];
    while ((current = current.parent) !== undefined) {
      branch.push(current);
    }
    return branch;
  }
}

/**
 * @callback actionCallback
 * @param {HTTPContext|WebSocketContext} ctx
 */
