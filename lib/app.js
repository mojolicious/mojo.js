import EventEmitter from 'events';
import defaultHelpersPlugin from './plugins/default-helpers.js';
import mockClient from '../lib/client/mock.js';
import testClient from '../lib/client/test.js';
import CLI from './cli.js';
import Client from './client.js';
import {callerFile} from './file.js';
import HTTPContext from './context/http.js';
import Renderer from './renderer.js';
import Router from './router.js';
import WebSocketContext from './context/websocket.js';

export default class App extends EventEmitter {
  constructor () {
    super();

    this.cli = new CLI(this);
    this.client = new Client();
    this.config = {};
    this.helpers = {};
    this.home = undefined;
    this.mode = process.env.NODE_ENV || 'development';
    this.models = {};
    this.renderer = new Renderer();
    this.router = new Router();
    this._warmup = false;

    this.plugin(defaultHelpersPlugin);
  }

  addHelper (name, fn) {
    this.helpers[name] = fn;
    return this;
  }

  any (...args) {
    return this.router.any(...args);
  }

  delete (...args) {
    return this.router.delete(...args);
  }

  get (...args) {
    return this.router.get(...args);
  }

  async handleRequest (ctx) {
    if (!this._warmup) await this.warmup();
    this.router.dispatch(ctx).then(result => {
      if (!result || !ctx.res.raw.writableEnded) ctx.helpers.notFound();
    }).catch(error => ctx.helpers.exception(error));
  }

  newHTTPContext (...args) {
    return new HTTPContext(this, ...args);
  }

  newMockClient (...args) {
    return mockClient(this, ...args);
  }

  newTestClient (...args) {
    return testClient(this, ...args);
  }

  newWebSocketContext (...args) {
    return new WebSocketContext(this, ...args);
  }

  options (...args) {
    return this.router.options(...args);
  }

  patch (...args) {
    return this.router.patch(...args);
  }

  plugin (plugin, ...args) {
    return plugin(this, ...args);
  }

  post (...args) {
    return this.router.post(...args);
  }

  put (...args) {
    return this.router.put(...args);
  }

  start () {
    if (process.argv[1] !== callerFile().toString()) return;
    return this.cli.start();
  }

  under (...args) {
    return this.router.under(...args);
  }

  async warmup () {
    this._warmup = true;
    await this.router.warmup();
  }

  websocket (...args) {
    return this.router.websocket(...args);
  }
}
