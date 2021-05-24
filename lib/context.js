import EventEmitter from 'events';
import Params from './body/params.js';
import ServerRequest from './server/request.js';

const ABSOLUTE = /^[a-zA-Z][a-zA-Z0-9]*:\/\//;

export default class Context extends EventEmitter {
  constructor (app, req, options) {
    super();

    this.app = app;
    this.exceptionFormat = app.exceptionFormat;
    this.log = app.log.child({requestId: req.requestId});
    this.plan = null;
    this.req = new ServerRequest(req, options);
    this.stash = {};
    this._params = undefined;
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

  get models () {
    return this.app.models;
  }

  async params (options) {
    if (this._params === undefined) {
      this._params = new Params(this.req.query);
      const type = this.req.get('Content-Type') ?? '';

      if (type.startsWith('application/x-www-form-urlencoded') === true) {
        (await this.req.form()).forEach((value, name) => this._params.append(name, value));
      } else if (type.startsWith('multipart/form-data') === true) {
        const form = await this.req.formData(options);
        form.forEach((value, name) => this._params.append(name, value));
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
