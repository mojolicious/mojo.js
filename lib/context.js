import EventEmitter from 'events';
import ServerRequest from './server/request.js';

const ABSOLUTE = /^[a-zA-Z][a-zA-Z0-9]*:\/\//;

export default class Context extends EventEmitter {
  constructor (app, req, options) {
    super();
    this.app = app;
    this.exceptionFormat = app.exceptionFormat;
    this.plan = null;
    this.req = new ServerRequest(req, options);
    this.stash = {};
    this._logger = undefined;
    this._session = undefined;
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
    if (this._logger === undefined) this._logger = this.app.log.child({requestId: this.req.requestId});
    return this._logger;
  }

  get models () {
    return this.app.models;
  }

  get session () {
    if (this._session === undefined) {
      this._session = this.app.session.load(this) ?? {};
      if (this.isWebSocket === false) this.res.once('send', () => this.app.session.store(this, this._session));
    }
    return this._session;
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
