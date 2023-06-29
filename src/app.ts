import type {Route} from './router/route.js';
import type {
  AnyArguments,
  AppOptions,
  BackendInfo,
  UserAgentOptions,
  MojoAction,
  MojoContext,
  MojoModels,
  NestedHelpers,
  RouteArguments,
  ScopedNestedHelpers,
  ServerOptions,
  TestUserAgentOptions
} from './types.js';
import {Readable} from 'node:stream';
import {CLI} from './cli.js';
import {Context} from './context.js';
import {Hooks} from './hooks.js';
import {Logger} from './logger.js';
import {Mime} from './mime.js';
import defaultConditionsPlugin from './plugins/default-conditions.js';
import defaultHelpersPlugin from './plugins/default-helpers.js';
import tmplEnginePlugin from './plugins/tmpl-engine.js';
import {Renderer} from './renderer.js';
import {Router} from './router.js';
import {ServerRequest} from './server/request.js';
import {ServerResponse} from './server/response.js';
import {Session} from './session.js';
import {Static} from './static.js';
import {MockUserAgent} from './user-agent/mock.js';
import {TestUserAgent} from './user-agent/test.js';
import {UserAgent} from './user-agent.js';
import {Validator} from './validator.js';
import Path from '@mojojs/path';

type AppHook = (app: App, ...args: any[]) => any;
type ContextHook = (app: MojoContext, ...args: any[]) => any;

type Decoration = ((...args: any[]) => any) | {get?: () => any; set?: (value: any) => any; configurable?: boolean};

const ContextWrapper = class extends Context {};

/**
 * Application class.
 */
export class App {
  /**
   * Command line interface.
   * @example
   * // Add another path to load commands from
   * app.cli.commandPaths.push(app.home.child('cli').toString());
   */
  cli: CLI = new CLI(this);
  /**
   * Application config.
   * @example
   * // Remove value
   * delete app.config.foo;
   *
   * // Assign multiple values at once
   * Object.assign(app.config, {foo: 'test', bar: 23});
   */
  config: Record<string, any>;
  /**
   * Default stash values.
   * @example
   * // Remove value
   * delete app.defaults.foo;
   *
   * // Assign multiple values at once
   * Object.assign(app.defaults, {foo: 'test', bar: 23});
   */
  defaults: Record<string, any> = {};
  /**
   * Detect if the application has been imported and disable the command line interface if it has.
   */
  detectImport: boolean;
  /**
   * Format for HTTP exceptions ("html", "json", or "txt").
   * @example
   * // Change default exception format for whole application
   * app.exceptionFormat = 'json';
   */
  exceptionFormat: string;
  /**
   * Application hooks.
   * @example
   * // Run a custom hook
   * await app.hooks.runHook('my:hook', foo, bar);
   */
  hooks: Hooks = new Hooks();
  /**
   * Application home directory.
   * @example
   * // Portably generate path relative to home directory
   * const path = app.home.child('data', 'important.txt');
   */
  home: Path = new Path();
  /**
   * Application logger.
   * @example
   * // Log debug message
   * app.log.debug('It works');
   */
  log: Logger;
  /**
   * MIME types.
   * @example
   * // Get MIME type for extension
   * const type = app.mime.extType('txt');
   */
  mime: Mime = new Mime();
  /**
   * Operating mode for application. Defaults to the value of the `NODE_ENV` environment variable or `development`.
   */
  mode: string;
  /**
   * Storage for user defined models.
   * @example
   * // Store database connection
   * app.models.pg = new Pg('postgres://127.0.0.1:5432/db');
   */
  models: MojoModels = {};
  /**
   * Application renderer.
   * @example
   * // Disable compression
   * app.renderer.autoCompress = false;
   *
   * // Add another "views" directory
   * app.renderer.viewPaths.push(app.home.child('views').toString());
   */
  renderer: Renderer = new Renderer();
  /**
   * Application router.
   * @example
   * // Add routes
   * const r = app.router;
   * r.get('/foo/bar').to('test#foo', {title: 'Hello Mojo!'});
   * r.post('/baz').to('test#baz');
   *
   * // Add another path to load controllers from
   * app.router.controllerPaths.push(app.home.child('more-controllers').toString());
   */
  router: Router = new Router();
  /**
   * Rotating secret passphrases used for signed cookies and the like.
   * @example
   * // Rotate passphrases
   * app.secrets = ['new_passw0rd', 'old_passw0rd', 'very_old_passw0rd'];
   */
  secrets: string[];
  /**
   * Encrypted cookie based session manager.
   * @example
   * // Change name of cookie used for all sessions
   * app.sessions.cookieName = 'mysession';
   *
   * // Disable SameSite feature
   * app.sessions.sameSite = 'none';
   */
  session: Session = new Session(this);
  /**
   * Static file server.
   * @example
   * // Add another "public" directory
   * app.static.publicPaths.push('/home/sri/public');
   *
   * // Add another "public" directory with higher precedence
   * app.static.publicPaths.unshift('/home/sri/themes/blue/public');
   */
  static: Static = new Static();
  /**
   * HTTP/WebSocket user-agent.
   * @example
   * # Perform HTTP request
   * const res = await app.ua.get('http://example.com');
   */
  ua: UserAgent = new UserAgent();
  /**
   * JSON schema validator.
   * @example
   * // Add a named schema for later use
   * app.validator.addSchema({type: 'object', properties: {test: {type: 'number'}}}, 'testForm');
   */
  validator = new Validator();

  _contextClass: any = class extends ContextWrapper {};
  _nestedHelpers: Record<string, NestedHelpers> = {};

  constructor(options: AppOptions = {}) {
    this.config = options.config ?? {};
    this.detectImport = options.detectImport ?? true;
    this.exceptionFormat = options.exceptionFormat ?? 'html';
    this.secrets = options.secrets ?? ['Insecure'];

    this.mode = options.mode ?? process.env.NODE_ENV ?? 'development';

    const isDev = this.mode === 'development';
    this.log = new Logger({historySize: isDev ? 10 : 0, level: isDev ? 'trace' : 'info'});

    this.plugin(defaultHelpersPlugin);
    this.plugin(defaultConditionsPlugin);
    this.plugin(tmplEnginePlugin);
  }

  /**
   * Add an application hook to extend the framework.
   * @example
   * // Run code whenever a server has been started
   * app.addAppHook('server:start', async app => {
   *   ...
   * });
   */
  addAppHook(name: string, fn: AppHook): this {
    this.hooks.addHook(name, fn);
    return this;
  }

  /**
   * Add a context hook to extend the framework.
   * @example
   * // Run code after a new request has been received
   * app.addContextHook('dispatch:before', async ctx => {
   *   ...
   * });
   */
  addContextHook(name: string, fn: ContextHook): this {
    this.hooks.addHook(name, fn);
    return this;
  }

  /**
   * Add a helper.
   * @example
   * // Render response with header
   * app.addHelper('renderWithHeader', async (ctx, ...args) => {
   *   ctx.res.set('X-Mojo', 'I <3 mojo.js!');
   *   await ctx.render(...args);
   * });
   *
   * // Render response with header using nested helper
   * app.addHelper('renderWith.header', async (ctx, ...args) => {
   *   ctx.res.set('X-Mojo', 'I <3 mojo.js!');
   *   await ctx.render(...args);
   * });
   */
  addHelper(name: string, fn: MojoAction): this {
    // Simple helper
    const nestedNames = name.split('.');
    if (nestedNames.length === 1) {
      return this.decorateContext(name, function (this: MojoContext, ...args: any[]) {
        return fn(this, ...args);
      });
    }

    // Nested helper
    if (nestedNames.length === 2) {
      const [getterName, methodName] = nestedNames;

      if (this._nestedHelpers[getterName] === undefined) {
        this._nestedHelpers[getterName] = {};
        this.decorateContext(getterName, {
          get: function (this: MojoContext) {
            return (this._nestedHelpersCache[getterName] ??= Object.create(this.app._nestedHelpers[getterName], {
              _ctx: {value: this}
            }));
          }
        });
      }

      this._nestedHelpers[getterName][methodName] = function (this: ScopedNestedHelpers, ...args: any[]) {
        return fn(this._ctx, ...args);
      };

      return this;
    }

    // Invalid helper name
    throw new Error(`The name "${name}" exceeds maximum depth (2) for nested helpers`);
  }

  /**
   * Generate route matching any of the listed HTTP request methods or all.
   * @example
   * // Route with pattern and destination
   * app.any('/user').to('User#whatever');
   *
   * // Route with HTTP methods, pattern, restrictive placeholders and destination
   * app.any(['DELETE', 'PUT'], '/:foo', {foo: /\w+/}).to('Foo#bar');
   *
   * // Route with pattern, name and destination
   * app.any('/:foo').name('foo_route').to('Foo#bar');
   *
   * // Route with pattern, condition and destination
   * app.any('/').requires({agent: /Firefox/}).to('Foo#bar');
   *
   * // Route with pattern and a closure as destination
   * app.any('/:foo', async ctx => ctx.render({text: 'Hello World!'}));
   */
  any(...args: AnyArguments): Route {
    return this.router.any(...args);
  }

  /**
   * Decorate context class with a method or getter/setter.
   * @example
   * // Decorate context with getter
   * app.decorateContext('helloWorld', {get: () => 'Hello World!'});
   */
  decorateContext(name: string, fn: Decoration): this {
    const proto: MojoContext = Context.prototype as MojoContext;
    if (Object.getOwnPropertyDescriptor(proto, name) != null) {
      throw new Error(`The name "${name}" is already used in the prototype chain`);
    }

    if (typeof fn !== 'function') {
      Object.defineProperty(this._contextClass.prototype, name, fn);
    } else {
      this._contextClass.prototype[name] = fn;
    }

    return this;
  }

  /**
   * Generate route matching only `DELETE` requests.
   * @example
   * // Route with destination
   * app.delete('/user').to('User#remove');
   */
  delete(...args: RouteArguments): Route {
    return this.router.delete(...args);
  }

  /**
   * Generate route matching only `GET` requests.
   * @example
   * // Route with destination
   * app.get('/user').to('User#show');
   */
  get(...args: RouteArguments): Route {
    return this.router.get(...args);
  }

  /**
   * Handle a new incoming request, used by servers.
   */
  async handleRequest(ctx: MojoContext): Promise<void> {
    if ((await this.hooks.runHook('dispatch:before', ctx)) === true) return;
    if (ctx.isWebSocket !== true && (await this.static.dispatch(ctx)) === true) return;

    if ((await this.hooks.runHook('router:before', ctx)) === true) return;
    if ((await this.router.dispatch(ctx)) === true) return;

    if (ctx.isWebSocket !== true) await ctx.notFound();
  }

  /**
   * Create a context for application.
   */
  newContext(req: ServerRequest, res: ServerResponse, backend: BackendInfo): MojoContext {
    const ctx = new this._contextClass(this, req, res, backend);
    Object.assign(ctx.stash, this.defaults);
    return ctx;
  }

  /**
   * Create a mock context for application. Very useful for testing helpers.
   * @example
   * // Use a mock context to call a helper
   * const ctx = app.newMockContext();
   * const html = ctx.assetTag('/app.js');
   */
  newMockContext(options: {headers?: string[]; method?: string; url?: string} = {}): MojoContext {
    const ctx: MojoContext = new this._contextClass(
      this,
      new ServerRequest({
        body: new Readable(),
        headers: options.headers ?? [],
        isSecure: false,
        isWebSocket: false,
        method: options.method ?? 'GET',
        remoteAddress: '127.0.0.1',
        reverseProxy: false,
        url: options.url ?? '/'
      }),
      new ServerResponse(() => ctx.log.trace('Mock response has been sent')),
      {name: 'mock'}
    );
    Object.assign(ctx.stash, this.defaults);
    return ctx;
  }

  /**
   * Create a new mock user-agent for application.
   */
  async newMockUserAgent(options?: UserAgentOptions, serverOptions?: ServerOptions): Promise<MockUserAgent> {
    return await MockUserAgent.newMockUserAgent(this, options, serverOptions);
  }

  /**
   * Create a new test user-agent for application.
   * @example
   * // Test plain text endpoint
   * const ua = await app.newTestUserAgent();
   * (await ua.getOk('/')).statusIs(200).bodyIs('Hello World!');
   */
  async newTestUserAgent(options?: TestUserAgentOptions, serverOptions?: ServerOptions): Promise<TestUserAgent> {
    return await TestUserAgent.newTestUserAgent(this, options, serverOptions);
  }

  /**
   * Your main hook into the application, it is a shortcut for the `app:start` hook and runs during application
   * startup. You can use it to perform tasks like preparing database connections.
   * @example
   * // Perform async operations on application startup
   * app.onStart(async app => {
   *   if (app.models.db === undefined) app.models.db = new SomeDatabase();
   *   await app.models.db.connect();
   * });
   */
  onStart(fn: AppHook): this {
    return this.addAppHook('app:start', fn);
  }

  /**
   * The opposite of `onStart`, it is a shortcut for the `app:stop` hook and runs during application shutdown. You can
   * use it to perform tasks like closing database connections gracefully.
   * @example
   * app.onStop(async app => {
   *   await app.models.db.disconnect();
   * });
   */
  onStop(fn: AppHook): this {
    return this.addAppHook('app:stop', fn);
  }

  /**
   * Generate route matching only `OPTIONS` requests.
   * @example
   * // Route with destination
   * app.options('/user').to('User#overview');
   */
  options(...args: RouteArguments): Route {
    return this.router.options(...args);
  }

  /**
   * Generate route matching only `PATCH` requests.
   * @example
   * // Route with destination
   * app.patch('/user').to('User#update');
   */
  patch(...args: RouteArguments): Route {
    return this.router.patch(...args);
  }

  /**
   * Register plugin.
   * @example
   * // Mount application under "/prefix"
   * app.plugin(mountPlugin, {app: myOtherApp, path: '/prefix'});
   *
   * // Load configuration from file
   * app.plugin(jsonConfigPlugin, {file: 'myapp.conf'});
   */
  plugin<T>(plugin: (app: App, options: Record<string, any>) => T, options: Record<string, any> = {}): T {
    return plugin(this, options);
  }

  /**
   * Generate route matching only `POST` requests.
   * @example
   * // Route with destination
   * app.post('/user').to('User#create');
   */
  post(...args: RouteArguments): Route {
    return this.router.post(...args);
  }

  /**
   * Generate route matching only `PUT` requests.
   * @example
   * // Route with destination
   * app.put('/user').to('User#replace');
   */
  put(...args: RouteArguments): Route {
    return this.router.put(...args);
  }

  /**
   * Start the command line interface.
   * @example
   * // Get arguments from "process.argv"
   * app.start();
   *
   * // Always start server (rarely used)
   * app.start('server', '-l', 'http://*:8080');
   */
  async start(command?: string, ...args: string[]): Promise<void> {
    if (this.detectImport === true && process.argv[1] !== Path.callerFile().toString()) return;
    return this.cli.start(command, ...args).catch(error => this.log.error(error.message));
  }

  /**
   * Generate route for a nested route with its own intermediate destination.
   * @example
   * // Intermediate destination and prefix shared between two routes
   * const auth = app.under('/user').to('User#auth');
   * auth.get('/show').to('User#show');
   * auth.post('/create').to('User#create');
   */
  under(...args: AnyArguments): Route {
    return this.router.under(...args);
  }

  /**
   * Warmup the cache, usually called automatically.
   */
  async warmup(): Promise<void> {
    await Promise.all([this.static, this.renderer, this.router].map(component => component.warmup()));
    await this.hooks.runHook('app:warmup', this);
  }

  /**
   * Generate route matching only WebSocket handshake requests.
   * @example
   * // Route with destination
   * app.websocket('/echo').to('Example#echo');
   */
  websocket(...args: RouteArguments): Route {
    return this.router.websocket(...args);
  }
}
