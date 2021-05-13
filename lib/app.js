import defaultHelpersPlugin from './plugins/default-helpers.js';
import EventEmitter from 'events';
import ejsEnginePlugin from './plugins/ejs-engine.js';
import MockClient from '../lib/client/mock.js';
import TestClient from '../lib/client/test.js';
import File from './file.js';
import CLI from './cli.js';
import Client from './client.js';
import HTTPContext from './context/http.js';
import Logger from './logger.js';
import Mime from './mime.js';
import Renderer from './renderer.js';
import Router from './router.js';
import Session from './session.js';
import Static from './static.js';
import tagHelpersPlugin from './plugins/tag-helpers.js';
import WebSocketContext from './context/websocket.js';

export default class App extends EventEmitter {
  constructor (options = {}) {
    super();

    this.cli = new CLI(this);
    this.client = new Client();
    this.config = {};
    this.home = undefined;
    this.mime = new Mime();
    this.models = {};
    this.mojo = undefined;
    this.renderer = new Renderer();
    this.router = new Router();
    this.session = new Session();
    this.static = new Static();
    this._httpContextClass = class extends HTTPContext {};
    this._mode = options.mode ?? process.env.NODE_ENV ?? 'development';
    this._websocketContextClass = class extends WebSocketContext {};

    const isDev = this._mode === 'development';
    this.log = new Logger({historySize: isDev ? 10 : 0, level: isDev ? 'debug' : 'info'});

    this.plugin(defaultHelpersPlugin);
    this.plugin(ejsEnginePlugin);
    this.plugin(tagHelpersPlugin);
  }

  addHelper (name, fn) {
    return this.decorateContext(name, function (...args) {
      return fn(this, ...args);
    });
  }

  any (...args) {
    return this.router.any(...args);
  }

  decorateContext (name, fn) {
    if (HTTPContext.prototype[name] !== undefined || WebSocketContext[name] !== undefined) {
      throw new Error(`The name "${name}" is already used in the prototype chain`);
    }

    if (typeof fn.get === 'function' || typeof fn.set === 'function') {
      Object.defineProperty(this._httpContextClass.prototype, name, fn);
      Object.defineProperty(this._websocketContextClass.prototype, name, fn);
    } else {
      this._httpContextClass.prototype[name] = fn;
      this._websocketContextClass.prototype[name] = fn;
    }

    return this;
  }

  delete (...args) {
    return this.router.delete(...args);
  }

  get (...args) {
    return this.router.get(...args);
  }

  handleRequest (ctx) {
    this.static.dispatch(ctx).then(result => {
      if (result === false) return this.router.dispatch(ctx);
    }).then(result => {
      if (result === false) ctx.notFound();
    }).catch(error => ctx.exception(error));
  }

  get mode () {
    return this._mode;
  }

  newHTTPContext (req, res) {
    return new this._httpContextClass(this, req, res);
  }

  newMockClient (options) {
    return MockClient.newMockClient(this, options);
  }

  newTestClient (options) {
    return TestClient.newTestClient(this, options);
  }

  newWebSocketContext (req) {
    return new this._websocketContextClass(this, req);
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
    await this.renderer.warmup();
    await this.router.warmup();
  }

  websocket (...args) {
    return this.router.websocket(...args);
  }
}
