import EventEmitter from 'events';
import defaultHelpersPlugin from './plugins/default-helpers.js';
import ejsEnginePlugin from './plugins/ejs-engine.js';
import mockClient from '../lib/client/mock.js';
import testClient from '../lib/client/test.js';
import CLI from './cli.js';
import Client from './client.js';
import {callerFile} from './file.js';
import HTTPContext from './context/http.js';
import Logger from './logger.js';
import Mime from './mime.js';
import Renderer from './renderer.js';
import Router from './router.js';
import Static from './static.js';
import WebSocketContext from './context/websocket.js';

export default class App extends EventEmitter {
  constructor () {
    super();

    this.cli = new CLI(this);
    this.client = new Client();
    this.config = {};
    this.helpers = {};
    this.home = undefined;
    this.log = new Logger();
    this.mime = new Mime();
    this.mode = process.env.NODE_ENV || 'development';
    this.models = {};
    this.renderer = new Renderer();
    this.router = new Router();
    this.static = new Static();
    this._warmup = undefined;

    this.plugin(defaultHelpersPlugin);
    this.plugin(ejsEnginePlugin);
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
    if (this._warmup === undefined) await this.warmup();
    if (await this.static.dispatch(ctx) !== false) return;
    if (await this.router.dispatch(ctx).catch(error => ctx.helpers.exception(error)) !== false) return;
    ctx.helpers.notFound();
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
    await this.renderer.warmup();
    await this.router.warmup();
  }

  websocket (...args) {
    return this.router.websocket(...args);
  }
}
