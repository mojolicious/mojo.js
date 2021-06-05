'use strict';

const Ajv = require('ajv');
const CLI = require('./cli');
const Client = require('./client');
const ejsEnginePlugin = require('./plugins/ejs-engine');
const exceptionHelpersPlugin = require('./plugins/exception-helpers');
const File = require('./file');
const headerConditionsPlugin = require('./plugins/header-conditions');
const Hooks = require('./hooks');
const HTTPContext = require('./context/http');
const Logger = require('./logger');
const Mime = require('./mime');
const MockClient = require('./client/mock');
const Renderer = require('./renderer');
const Router = require('./router');
const Session = require('./session');
const Static = require('./static');
const TestClient = require('./client/test');
const viewHelpersPlugin = require('./plugins/view-helpers');
const WebSocketContext = require('./context/websocket');

class App {
  constructor (options = {}) {
    this.cli = new CLI(this);
    this.client = new Client();
    this.config = options.config ?? {};
    this.detectImport = options.detectImport ?? true;
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
    this.validator = new Ajv();

    this._httpContextClass = class extends HTTPContext {};
    this._mode = options.mode ?? process.env.NODE_ENV ?? 'development';
    this._server = null;
    this._websocketContextClass = class extends WebSocketContext {};

    const isDev = this._mode === 'development';
    this.log = new Logger({historySize: isDev ? 10 : 0, level: isDev ? 'trace' : 'info'});

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
    try {
      if (ctx.isWebSocket === true) {
        if (await this.hooks.runHook('websocket', ctx) === true) return;
        await this.router.dispatch(ctx);
        return;
      }

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

  get server () {
    return this._server?.deref() ?? null;
  }

  set server (server) {
    this._server = new WeakRef(server);
  }

  start (command, ...options) {
    if (this.detectImport === true && process.argv[1] !== File.callerFile().toString()) return;
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

module.exports = App;
