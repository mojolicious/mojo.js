import type Route from './router/route.js';
import type Server from './server.js';
import type {
  AnyArguments,
  AppOptions,
  ClientOptions,
  MojoAction,
  MojoContext,
  MojoDecoration,
  MojoHook,
  MojoHTTPContext,
  MojoPlugin,
  MojoStash,
  MojoWebSocketContext,
  RouteArguments,
  ServerRequestOptions,
  TestClientOptions
} from './types.js';
import type {IncomingMessage, ServerResponse} from 'http';
import CLI from './cli.js';
import Client from './client.js';
import MockClient from './client/mock.js';
import TestClient from './client/test.js';
import HTTPContext from './context/http.js';
import WebSocketContext from './context/websocket.js';
import File from './file.js';
import Hooks from './hooks.js';
import Logger from './logger.js';
import Mime from './mime.js';
import ejsEnginePlugin from './plugins/ejs-engine.js';
import exceptionHelpersPlugin from './plugins/exception-helpers.js';
import headerConditionsPlugin from './plugins/header-conditions.js';
import viewHelpersPlugin from './plugins/view-helpers.js';
import Renderer from './renderer.js';
import Router from './router.js';
import Session from './session.js';
import Static from './static.js';
import Ajv from 'ajv';

export default class App {
  cli: CLI = new CLI(this);
  client: Client = new Client();
  config: MojoStash;
  detectImport: boolean;
  exceptionFormat: string;
  hooks: Hooks = new Hooks();
  home: File = new File();
  log: Logger;
  mime: Mime = new Mime();
  models: MojoStash = {};
  mojo: (options?: AppOptions) => App = () => new App();
  renderer: Renderer = new Renderer();
  router: Router = new Router();
  secrets: string[];
  session: Session = new Session(this);
  static: Static = new Static();
  validator: Ajv = new Ajv();
  _httpContextClass: any = class extends HTTPContext {};
  _mode: string;
  _server: WeakRef<Server> | null = null;
  _websocketContextClass: any = class extends WebSocketContext {};

  constructor (options: AppOptions = {}) {
    this.config = options.config ?? {};
    this.detectImport = options.detectImport ?? true;
    this.exceptionFormat = options.exceptionFormat ?? 'html';
    this.secrets = options.secrets ?? ['Insecure'];

    this._mode = options.mode ?? process.env.NODE_ENV ?? 'development';

    const isDev = this._mode === 'development';
    this.log = new Logger({historySize: isDev ? 10 : 0, level: isDev ? 'trace' : 'info'});

    this.plugin(ejsEnginePlugin);
    this.plugin(exceptionHelpersPlugin);
    this.plugin(headerConditionsPlugin);
    this.plugin(viewHelpersPlugin);
  }

  addHelper (name: string, fn: MojoAction): this {
    return this.decorateContext(name, function (this: MojoContext, ...args: any[]) {
      return fn(this, ...args);
    });
  }

  addHook (name: string, fn: MojoHook): this {
    this.hooks.addHook(name, fn);
    return this;
  }

  any (...args: AnyArguments): Route {
    return this.router.any(...args);
  }

  decorateContext (name: string, fn: MojoDecoration): this {
    const httpProto: MojoContext = HTTPContext.prototype;
    const websocketProto: MojoContext = WebSocketContext.prototype;
    if (httpProto[name] !== undefined || websocketProto[name] !== undefined) {
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

  delete (...args: RouteArguments): Route {
    return this.router.delete(...args);
  }

  get (...args: RouteArguments): Route {
    return this.router.get(...args);
  }

  async handleRequest (ctx: MojoContext): Promise<void> {
    if (ctx.isWebSocket) {
      if (await this.hooks.runHook('websocket', ctx) === true) return;
      await this.router.dispatch(ctx);
      return;
    }

    if (await this.hooks.runHook('request', ctx) === true) return;
    if (await this.static.dispatch(ctx)) return;
    if (await this.router.dispatch(ctx)) return;
    await ctx.notFound();
  }

  get mode (): string {
    return this._mode;
  }

  newHTTPContext (req: IncomingMessage, res: ServerResponse, options: ServerRequestOptions): MojoHTTPContext {
    return new this._httpContextClass(this, req, res, options);
  }

  async newMockClient (options?: ClientOptions): Promise<MockClient> {
    return await MockClient.newMockClient(this, options);
  }

  async newTestClient (options?: TestClientOptions): Promise<TestClient> {
    return await TestClient.newTestClient(this, options);
  }

  newWebSocketContext (req: IncomingMessage, options: ServerRequestOptions): MojoWebSocketContext {
    return new this._websocketContextClass(this, req, options);
  }

  options (...args: RouteArguments): Route {
    return this.router.options(...args);
  }

  patch (...args: RouteArguments): Route {
    return this.router.patch(...args);
  }

  plugin (plugin: MojoPlugin, options: MojoStash = {}): any {
    return plugin(this, options);
  }

  post (...args: RouteArguments): Route {
    return this.router.post(...args);
  }

  put (...args: RouteArguments): Route {
    return this.router.put(...args);
  }

  get server (): Server | null {
    return this._server?.deref() ?? null;
  }

  set server (server: Server | null) {
    this._server = server === null ? null : new WeakRef(server);
  }

  start (command: string, ...args: string[]): any {
    if (this.detectImport && process.argv[1] !== File.callerFile().toString()) return;
    return this.cli.start(command, ...args);
  }

  under (...args: AnyArguments): Route {
    return this.router.under(...args);
  }

  async warmup (): Promise<void> {
    await this.renderer.warmup();
    await this.router.warmup();
  }

  websocket (...args: RouteArguments): Route {
    return this.router.websocket(...args);
  }
}
