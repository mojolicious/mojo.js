import EventEmitter from 'events';
import Params from './body/params.js';
import ServerRequest from './server/request.js';

const ABSOLUTE = /^[a-zA-Z][a-zA-Z0-9]*:\/\//;

export default class Context extends EventEmitter {
  constructor (app, req, options) {
    super({captureRejections: true});

    this.app = app;
    this.exceptionFormat = app.exceptionFormat;
    this.log = app.log.child({requestId: req.requestId});
    this.plan = null;
    this.req = new ServerRequest(req, options);
    this.stash = {};
    this._params = undefined;
    this._session = undefined;
  }

  [Symbol.for('nodejs.rejection')] (error) {
    this.exception(error);
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

  get models () {
    return this.app.models;
  }

  async params (options) {
    if (this._params === undefined) {
      this._params = new Params(this.req.query);
      for (const [name, value] of await this.req.form(options)) {
        this._params.append(name, value);
      }
    }

    return this._params;
  }

  schema (schema) {
    if (typeof schema === 'string') return this.app.validator.getSchema(schema);
    if (schema.$id !== undefined) return this.app.validator.getSchema(schema.$id) || this.app.validator.compile(schema);
    return this.app.validator.compile(schema);
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
