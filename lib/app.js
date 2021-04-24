'use strict';

import EventEmitter from 'events';
import CLI from './cli.js';
import HTTPContext from './context/http.js';
import Renderer from './renderer.js';
import Router from './router.js';

export default class App extends EventEmitter {
  constructor () {
    super();

    this.cli = new CLI(this);
    this.helpers = {};
    this.renderer = new Renderer();
    this.router = new Router();

    this.addHelper('not_found', ctx => {
      ctx.res.raw.writeHead(404, {'Content-Type': 'text/plain'});
      ctx.res.raw.end('Not found');
    });
  }

  addHelper (name, fn) {
    this.helpers[name] = fn;
    return this;
  }

  any (...args) {
    return this.router.any(...args);
  }

  handle (ctx) {
    this.router.dispatch(ctx);
  }

  newHTTPContext (...args) {
    return new HTTPContext(this, ...args);
  }

  start () {
    return this.cli.start();
  }
}

export {App};
