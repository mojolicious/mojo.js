import assert from 'assert';
import Pattern from './pattern.js';

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

  any (...args) {
    const child = new Route();

    const pattern = child.pattern;
    for (const arg of args) {
      if (typeof arg === 'string') {
        child.defaultName = arg.replace(/[^0-9a-z]+/gi, '_').replace(/^_|_$/g, '');
        pattern.parse(arg);
      } else if (arg instanceof Array) {
        child.methods = arg;
      } else if (typeof arg === 'function') {
        pattern.defaults.fn = arg;
      } else if (typeof arg === 'object') {
        Object.assign(pattern.constraints, arg);
      }
    }
    pattern.types = this.root.types;

    return this.addChild(child);
  }

  delete (...args) {
    return this.any(['DELETE'], ...args);
  }

  get (...args) {
    return this.any(['GET'], ...args);
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

  options (...args) {
    return this.any(['OPTIONS'], ...args);
  }

  get parent () {
    return this._parent?.deref();
  }

  set parent (parent) {
    this._parent = new WeakRef(parent);
  }

  patch (...args) {
    return this.any(['PATCH'], ...args);
  }

  post (...args) {
    return this.any(['POST'], ...args);
  }

  put (...args) {
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

  set root (root) {
    this._root = new WeakRef(root);
  }

  to (target) {
    const defaults = this.pattern.defaults;

    if (typeof target === 'string') {
      const parts = target.split('#');
      if (parts[0] !== '') defaults.controller = parts[0];
      if (parts.length > 1 && parts[1] !== '') defaults.action = parts[1];
    } else if (typeof target === 'function') {
      defaults.fn = target;
    } else {
      Object.assign(defaults, target);
    }

    return this;
  }

  under (...args) {
    const child = this.any(...args);
    child.underRoute = true;
    return child;
  }

  websocket (...args) {
    const child = this.any(...args);
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
