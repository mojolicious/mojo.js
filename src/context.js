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

  [EventEmitter.captureRejectionSymbol] (error) {
    this.exception(error);
  }

  get client () {
    return this.app.client;
  }

  get config () {
    return this.app.config;
  }

  get home () {
    return this.app.home;
  }

  get isSessionActive () {
    return this._session !== undefined;
  }

  get isWebSocket () {
    return false;
  }

  get models () {
    return this.app.models;
  }

  async params (options) {
    if (this._params === undefined) {
      const req = this.req;
      const params = this._params = new Params(req.query);
      for (const [name, value] of await req.form(options)) {
        params.append(name, value);
      }
    }

    return this._params;
  }

  schema (schema) {
    const validator = this.app.validator;
    if (typeof schema === 'string') return validator.getSchema(schema);
    if (schema.$id !== undefined) return validator.getSchema(schema.$id) || validator.compile(schema);
    return validator.compile(schema);
  }

  async session () {
    if (this._session === undefined) this._session = await this.app.session.load(this) ?? {};
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
