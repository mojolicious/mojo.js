import Ajv from 'ajv';
import CLI from './cli.js';
import Client from './client.js';
import ejsEnginePlugin from './plugins/ejs-engine.js';
import exceptionHelpersPlugin from './plugins/exception-helpers.js';
import File from './file.js';
import headerConditionsPlugin from './plugins/header-conditions.js';
import Hooks from './hooks.js';
import HTTPContext from './context/http.js';
import Logger from './logger.js';
import Mime from './mime.js';
import MockClient from './client/mock.js';
import Renderer from './renderer.js';
import Router from './router.js';
import Session from './session.js';
import Static from './static.js';
import TestClient from './client/test.js';
import viewHelpersPlugin from './plugins/view-helpers.js';
import WebSocketContext from './context/websocket.js';

/** Class representing a mojo.js application. */
export default class App {
  /**
   * Create mojo.js application.
   * @param {{
   *   config?: Object,
   *   detectImport?: boolean,
   *   exceptionFormat?: string,
   *   secrets?: string[],
   *   mode?: string
   * }} [options] - Optional settings.
   */
  constructor (options = {}) {
    /** @type {CLI} - Command line interface. */
    this.cli = new CLI(this);

    /** @type {Client} - HTTP/WebSocket client. */
    this.client = new Client();

    /** @type {Object} - Plain object containing the application config. */
    this.config = options.config ?? {};

    /** @type {boolean} - Deactivate the command line interface if the application has been imported somewhere. */
    this.detectImport = options.detectImport ?? true;

    /** @type {string} - Default exception format, usually "html", "txt" or "json". */
    this.exceptionFormat = options.exceptionFormat ?? 'html';

    /** @type {Hooks} - Plugin hooks. */
    this.hooks = new Hooks();

    /** @type {File} - Application home directory. */
    this.home = undefined;

    /** @type {Mime} - MIME types. */
    this.mime = new Mime();

    /** @type {Object} - Plain object containing user defined models. */
    this.models = {};

    /** @type {Function} - The mojo function and entry point into the class hierarchy. */
    this.mojo = undefined;

    /** @type {Renderer} - Renderer for views. */
    this.renderer = new Renderer();

    /** @type {Router} - Router to connect requests with controllers. */
    this.router = new Router();

    /** @type {string[]} - Secrets used to encrypt and decrypt sessions. */
    this.secrets = options.secrets ?? ['Insecure'];

    /** @type {Session} - Session manager. */
    this.session = new Session(this);

    /** @type {Static} - Static file server. */
    this.static = new Static();

    /**
     * @type {Ajv} - Validator used for JSON Schema data structure validation.
     * @see {@link https://www.npmjs.com/package/ajv}
     */
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

  /** Register helper.
   * @param {string} name - Helper name.
   * @param {contextCallback} fn - Helper function.
   * @returns {this} The application.
   */
  addHelper (name, fn) {
    return this.decorateContext(name, function (...args) {
      return fn(this, ...args);
    });
  }

  /** Register plugin hook.
   * @param {string} name - Hook name.
   * @param {Function} fn - Hook function.
   * @returns {this} The application.
   */
  addHook (name, fn) {
    this.hooks.addHook(name, fn);
    return this;
  }

  /** Create a route.
   * @param {string[]|string|actionCallback} [methods] - Request methods.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns A new route.
   * @example
   *   // Route to controller
   *   app.any('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   app.any('/:id', ctx => ctx.render({text: ctx.stash.id}));
   *
   *   // Route with everything
   *   app.any(['PUT', 'PATCH'], '/:id', {id: /\d+/}, ctx => ctx.render({text: ctx.stash.id}));
   */
  any (methods, pattern, constraints, fn) {
    return this.router.any(methods, pattern, constraints, fn);
  }

  /** Decorate HTTP and WebSocket contexts with a method or getter/setter.
   * @param {string} name - Method name.
   * @param {Function|{get?: Function, set?: Function}} fn - Method or getter/setter.
   * @returns {this} The application.
   */
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

  /** Create a DELETE route.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns A new route.
   * @example
   *   // Route to controller
   *   app.delete('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   app.delete('/:id', ctx => ctx.render({text: ctx.stash.id}));
   *
   *   // Route with everything
   *   app.delete('/:id', {id: /\d+/}, ctx => ctx.render({text: ctx.stash.id}));
   */
  delete (pattern, constraints, fn) {
    return this.router.delete(pattern, constraints, fn);
  }

  /** Create a GET route.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @example
   *   // Route to controller
   *   app.get('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   app.get('/:id', ctx => ctx.render({text: ctx.stash.id}));
   *
   *   // Route with everything
   *   app.get('/:id', {id: /\d+/}, ctx => ctx.render({text: ctx.stash.id}));
   */
  get (pattern, constraints, fn) {
    return this.router.get(pattern, constraints, fn);
  }

  /**
   * Handle HTTP request or WebSocket handshake.
   * @param {HTTPContext|WebSocketContext} ctx - HTTP request or WebSocket handshake to handle.
   * @returns {Promise} Resolves when the request or handshake has been handled.
   */
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

  /** @type {string} - Active application mode. */
  get mode () {
    return this._mode;
  }

  /**
   * Create HTTP context.
   * @param {http.IncomingMessage} [req] - HTTP request.
   * @param {http.ServerResponse} [res] - HTTP response.
   * @param {{reverseProxy?: boolean}} [options] - Optional settings.
   * @returns {HTTPContext} A new HTTP context.
   */
  newHTTPContext (req, res, options) {
    return new this._httpContextClass(this, req, res, options);
  }

  /**
   * Create HTTP/WebSocket mock client for application.
   * @param {{baseURL?: string, maxRedirects?: number, name?: string}} [options] - Optional settings.
   * @returns {MockClient} A new mock client.
   */
  newMockClient (options) {
    return MockClient.newMockClient(this, options);
  }

  /**
   * Create HTTP/WebSocket test client for application.
   * @param {{baseURL?: string, maxRedirects?: number, name?: string, tap?: object}} [options] - Optional settings.
   * @returns {TestClient} A new test client.
   */
  newTestClient (options) {
    return TestClient.newTestClient(this, options);
  }

  /**
   * Create WebSocket context.
   * @param {http.IncomingMessage} [req] - Handshake request.
   * @param {{reverseProxy?: boolean}} [options] - Optional settings.
   * @returns {WebSocketContext} A new WebSocket context.
   */
  newWebSocketContext (req, options) {
    return new this._websocketContextClass(this, req, options);
  }

  /** Create a OPTIONS route.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns A new route.
   * @example
   *   // Route to controller
   *   app.options('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   app.options('/:id', ctx => ctx.render({text: ctx.stash.id}));
   *
   *   // Route with everything
   *   app.options('/:id', {id: /\d+/}, ctx => ctx.render({text: ctx.stash.id}));
   */
  options (pattern, constraints, fn) {
    return this.router.options(pattern, constraints, fn);
  }

  /** Create a PATCH route.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns A new route.
   * @example
   *   // Route to controller
   *   app.patch('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   app.patch('/:id', ctx => ctx.render({text: ctx.stash.id}));
   *
   *   // Route with everything
   *   app.patch('/:id', {id: /\d+/}, ctx => ctx.render({text: ctx.stash.id}));
   */
  patch (pattern, constraints, fn) {
    return this.router.patch(pattern, constraints, fn);
  }

  /**
   * Register plugin.
   * @param {Function} plugin - Plugin to be registered.
   * @param {Object} options - Options to be passed to the plugin.
   * @returns {*} Plugin return value.
   */
  plugin (plugin, options) {
    return plugin(this, options);
  }

  /** Create a POST route.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns A new route.
   * @example
   *   // Route to controller
   *   app.post('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   app.post('/:id', ctx => ctx.render({text: ctx.stash.id}));
   *
   *   // Route with everything
   *   app.post('/:id', {id: /\d+/}, ctx => ctx.render({text: ctx.stash.id}));
   */
  post (pattern, constraints, fn) {
    return this.router.post(pattern, constraints, fn);
  }

  /** Create a PUT route.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns A new route.
   * @example
   *   // Route to controller
   *   app.put('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   app.put('/:id', ctx => ctx.render({text: ctx.stash.id}));
   *
   *   // Route with everything
   *   app.put('/:id', {id: /\d+/}, ctx => ctx.render({text: ctx.stash.id}));
   */
  put (pattern, constraints, fn) {
    return this.router.put(pattern, constraints, fn);
  }

  /** @type {Server} - Server running this application. */
  get server () {
    return this._server?.deref() ?? null;
  }

  set server (server) {
    this._server = new WeakRef(server);
  }

  /**
   * Start command line interface.
   * @param {string} [command] - Command name.
   * @param {...*} [args] - Arguments to be passed to command.
   * @returns {Promise<*>} Resolves to command return value.
   */
  start (command, ...args) {
    if (this.detectImport === true && process.argv[1] !== File.callerFile().toString()) return;
    return this.cli.start(command, ...args);
  }

  /** Create an under route.
   * @param {string[]|string|actionCallback} [methods] - Request methods.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns A new route.
   * @example
   *   // Route to controller
   *   const foo = app.under('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   const withId = app.under('/:id', ctx => {...});
   *
   *   // Route with everything
   *   const withId = app.under(['PUT', 'PATCH'], '/:id', {id: /\d+/}, ctx => {...});
   */
  under (methods, pattern, constraints, fn) {
    return this.router.under(methods, pattern, constraints, fn);
  }

  /**
   * Warm up renderer and router caches for incoming requests.
   * @returns {Promise} Resolves when caches are ready.
   */
  async warmup () {
    await this.renderer.warmup();
    await this.router.warmup();
  }

  /** Create a WebSocket route.
   * @param {string[]|string|actionCallback} [pattern] - Route pattern.
   * @param {string[]|string|actionCallback} [constraints] - Route pattern constraints.
   * @param {string[]|string|actionCallback} [fn] - Action without controller.
   * @returns A new route.
   * @example
   *   // Route to controller
   *   app.websocket('/foo').to('bar#baz');
   *
   *   // Route to action without controller
   *   app.websocket('/:prefix', ctx => {...});
   *
   *   // Route with everything
   *   app.websocket('/:id', {id: /\d+/}, ctx => {...});
   */
  websocket (pattern, constraints, fn) {
    return this.router.websocket(pattern, constraints, fn);
  }
}

/**
 * @callback actionCallback
 * @param {HTTPContext|WebSocketContext} ctx
 */

/**
 * @callback contextCallback
 * @param {HTTPContext|WebSocketContext} ctx
 * @param {...*} [args]
 */
