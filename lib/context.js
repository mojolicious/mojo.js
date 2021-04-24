'use strict';

import ServerRequest from './server/request.js';

export default class Context {
  constructor (app, req) {
    this.app = app;
    this.helpers = new Proxy(app.helpers, {get: (target, prop) => (...args) => target[prop](this, ...args)});
    this.req = new ServerRequest(req);
    this.stash = {};
  }
}
