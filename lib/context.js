import EventEmitter from 'events';
import ServerRequest from './server/request.js';

export default class Context extends EventEmitter {
  constructor (app, req) {
    super();
    this.app = app;
    this.helpers = new Proxy(app.helpers, {get: (target, prop) => (...args) => target[prop](this, ...args)});
    this.isRendered = false;
    this.req = new ServerRequest(req);
    this.stash = {};
  }
}
