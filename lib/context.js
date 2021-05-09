import EventEmitter from 'events';
import ServerRequest from './server/request.js';

const ABSOLUTE = /^[a-zA-Z][a-zA-Z0-9]*:\/\//;

export default class Context extends EventEmitter {
  constructor (app, req) {
    super();
    this.app = app;
    this.helpers = new Proxy(app.helpers, {get: (target, prop) => (...args) => target[prop](this, ...args)});
    this.plan = undefined;
    this.req = new ServerRequest(req);
    this.stash = {};
    this._logger = undefined;
  }

  get config () {
    return this.app.config;
  }

  get client () {
    return this.app.client;
  }

  get home () {
    return this.app.home;
  }

  get isWebSocket () {
    return false;
  }

  get log () {
    if (this._logger === undefined) this._logger = this.app.log.child(`[${this.req.requestId}]`);
    return this._logger;
  }

  get models () {
    return this.app.models;
  }

  urlFor (target, values) {
    if (target === undefined || target === 'current') {
      if (this.plan === undefined) return null;
      const result = this.plan.render(values);
      return this._urlForPath(result.path, result.websocket);
    }

    if (target.startsWith('/')) return this.req.baseURL + target;
    if (ABSOLUTE.test(target)) return target;

    const route = this.app.router.lookup(target);
    if (route === null) return null;
    return this._urlForPath(route.render(values), route.hasWebSocket());
  }

  urlForFile (path) {
    if (ABSOLUTE.test(path)) return path;
    return this.req.baseURL + this.app.static.filePath(path);
  }

  _urlForPath (path, isWebSocket) {
    const url = this.req.baseURL + path;
    return isWebSocket === true ? url.replace(/^http/, 'ws') : url;
  }
}
