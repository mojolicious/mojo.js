import ejsEnginePlugin from './plugins/ejs-engine.js';
import exceptionHelpersPlugin from './plugins/exception-helpers.js';
import headerConditionsPlugin from './plugins/header-conditions.js';
import MockClient from './client/mock.js';
import TestClient from './client/test.js';
import File from './file.js';
import CLI from './cli.js';
import Client from './client.js';
import Hooks from './hooks.js';
import HTTPContext from './context/http.js';
import Logger from './logger.js';
import Mime from './mime.js';
import Renderer from './renderer.js';
import Router from './router.js';
import Session from './session.js';
import Static from './static.js';
import viewHelpersPlugin from './plugins/view-helpers.js';
import WebSocketContext from './context/websocket.js';

export default class App {
  constructor (options = {}) {
    this.cli = new CLI(this);
    this.client = new Client();
    this.config = options.config ?? {};
    this.exceptionFormat = options.exceptionFormat ?? 'html';
    this.hooks = new Hooks();
    this.home = undefined;
    this.mime = new Mime();
    this.models = {};
    this.mojo = undefined;
    this.renderer = new Renderer();
    this.router = new Router();
    this.secrets = options.secrets ?? ['Insecure'];
    this.session = new Session(this);
    this.static = new Static();
    this._httpContextClass = class extends HTTPContext {};
    this._mode = options.mode ?? process.env.NODE_ENV ?? 'development';
    this._websocketContextClass = class extends WebSocketContext {};

    const isDev = this._mode === 'development';
    this.log = new Logger({historySize: isDev ? 10 : 0, level: isDev ? 'debug' : 'info'});

    this.plugin(ejsEnginePlugin);
    this.plugin(exceptionHelpersPlugin);
    this.plugin(headerConditionsPlugin);
    this.plugin(viewHelpersPlugin);
  }

  addHelper (name, fn) {
    return this.decorateContext(name, function (...args) {
      return fn(this, ...args);
    });
  }

  addHook (name, fn) {
    this.hooks.addHook(name, fn);
    return this;
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

  async handleRequest (ctx) {
    if (ctx.isWebSocket === true) {
      if (await this.hooks.runHook('websocket', ctx) === true) return;
      await this.router.dispatch(ctx);
      return;
    }

    try {
      if (await this.hooks.runHook('request', ctx) === true) return;
      if (await this.static.dispatch(ctx) === true) return;
      if (await this.router.dispatch(ctx) === true) return;
      await ctx.notFound();
    } catch (error) {
      await ctx.exception(error);
    }
  }

  get mode () {
    return this._mode;
  }

  newHTTPContext (req, res, options) {
    return new this._httpContextClass(this, req, res, options);
  }

  newMockClient (options) {
    return MockClient.newMockClient(this, options);
  }

  newTestClient (options) {
    return TestClient.newTestClient(this, options);
  }

  newWebSocketContext (req, options) {
    return new this._websocketContextClass(this, req, options);
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
