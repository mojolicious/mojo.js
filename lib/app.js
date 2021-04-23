'use strict';

const EventEmitter = require('events');
const CLI = require('./cli');
const HTTPContext = require('./context/http');
const Renderer = require('./renderer');
const Router = require('./router');

class App extends EventEmitter {
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
    return this.cli.start.apply(this.cli, arguments);
  }
}

module.exports = App;
