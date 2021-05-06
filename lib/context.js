import EventEmitter from 'events';
import ServerRequest from './server/request.js';

export default class Context extends EventEmitter {
  constructor (app, req) {
    super();
    this.app = app;
    this.helpers = new Proxy(app.helpers, {get: (target, prop) => (...args) => target[prop](this, ...args)});
    this.req = new ServerRequest(req);
    this.stash = {};
    this._logger = undefined;
  }

  get config () {
    return this.app.config;
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
}
