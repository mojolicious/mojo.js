import defaultHelpersPlugin from './plugins/default-helpers.js';
import EventEmitter from 'events';
import ejsEnginePlugin from './plugins/ejs-engine.js';
import mockClient from '../lib/client/mock.js';
import testClient from '../lib/client/test.js';
import File from './file.js';
import CLI from './cli.js';
import Client from './client.js';
import HTTPContext from './context/http.js';
import Logger from './logger.js';
import Mime from './mime.js';
import Renderer from './renderer.js';
import Router from './router.js';
import Static from './static.js';
import tagHelpersPlugin from './plugins/tag-helpers.js';
import WebSocketContext from './context/websocket.js';

export default class App extends EventEmitter {
  constructor (options = {}) {
    super();

    this.cli = new CLI(this);
    this.client = new Client();
    this.config = {};
    this.helpers = {};
    this.home = undefined;
    this.mime = new Mime();
    this.models = {};
    this.mojo = undefined;
    this.renderer = new Renderer();
    this.router = new Router();
    this.static = new Static();
    this._mode = options.mode ?? process.env.NODE_ENV ?? 'development';
    this._warmup = undefined;

    const isDev = this._mode === 'development';
    this.log = new Logger({historySize: isDev ? 10 : 0, level: isDev ? 'debug' : 'info'});

    this.plugin(defaultHelpersPlugin);
    this.plugin(ejsEnginePlugin);
    this.plugin(tagHelpersPlugin);
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
    if (await this.router.dispatch(ctx).catch(error => ctx.$.exception(error)) !== false) return;
    ctx.$.notFound();
  }

  get mode () {
    return this._mode;
  }

  newHTTPContext (req, res) {
    return new HTTPContext(this, req, res);
  }

  newMockClient (options) {
    return mockClient(this, options);
  }

  newTestClient (options) {
    return testClient(this, options);
  }

  newWebSocketContext (req) {
    return new WebSocketContext(this, req);
  }

  options (...args) {
    return this.router.options(...args);
  }

  patch (...args) {
    return this.router.patch(...args);
  }

  plugin (plugin, options) {
    return plugin(this, options);
  }

  post (...args) {
    return this.router.post(...args);
  }

  put (...args) {
    return this.router.put(...args);
  }

  start (command, ...options) {
    if (process.argv[1] !== File.callerFile().toString()) return;
    return this.cli.start(command, ...options);
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
