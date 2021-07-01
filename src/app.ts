import type Route from './router/route.js';
import type Server from './server.js';
import type {
  AnyArguments,
  AppOptions,
  ClientOptions,
  MojoAction,
  MojoContext,
  MojoStash,
  RouteArguments,
  ServerRequestOptions,
  TestClientOptions
} from './types.js';
import type {IncomingMessage, ServerResponse} from 'http';
import CLI from './cli.js';
import Client from './client.js';
import MockClient from './client/mock.js';
import TestClient from './client/test.js';
import Context from './context.js';
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

type Decoration = ((...args: any[]) => any) & {get?: () => any, set?: (value: any) => any};
export type Plugin = (app: App, options: MojoStash) => any;

type AppHook = (app: App, ...args: any[]) => any;
type ContextHook = (app: MojoContext, ...args: any[]) => any;

const ContextWrapper = class extends Context {};

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
  renderer: Renderer = new Renderer();
  router: Router = new Router();
  secrets: string[];
  session: Session = new Session(this);
  static: Static = new Static();
  validator: Ajv = new Ajv();
  _contextClass: any = class extends ContextWrapper {};
  _mode: string;
  _server: WeakRef<Server> | null = null;

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

  addAppHook (name: string, fn: AppHook): this {
    this.hooks.addHook(name, fn);
    return this;
  }

  addContextHook (name: string, fn: ContextHook): this {
    this.hooks.addHook(name, fn);
    return this;
  }

  addHelper (name: string, fn: MojoAction): this {
    return this.decorateContext(name, function (this: MojoContext, ...args: any[]) {
      return fn(this, ...args);
    });
  }

  any (...args: AnyArguments): Route {
    return this.router.any(...args);
  }

  decorateContext (name: string, fn: Decoration): this {
    const proto: MojoContext = Context.prototype;
    if (Object.getOwnPropertyDescriptor(proto, name) != null) {
      throw new Error(`The name "${name}" is already used in the prototype chain`);
    }

    if (typeof fn.get === 'function' || typeof fn.set === 'function') {
      Object.defineProperty(this._contextClass.prototype, name, fn);
    } else {
      this._contextClass.prototype[name] = fn;
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

  newContext (req: IncomingMessage, res: ServerResponse, options: ServerRequestOptions): MojoContext {
    return new this._contextClass(this, req, res, options);
  }

  async newMockClient (options?: ClientOptions): Promise<MockClient> {
    return await MockClient.newMockClient(this, options);
  }

  async newTestClient (options?: TestClientOptions): Promise<TestClient> {
    return await TestClient.newTestClient(this, options);
  }

  options (...args: RouteArguments): Route {
    return this.router.options(...args);
  }

  patch (...args: RouteArguments): Route {
    return this.router.patch(...args);
  }

  plugin (plugin: Plugin, options: MojoStash = {}): any {
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

  async start (command?: string, ...args: string[]): Promise<void> {
    if (!this.detectImport || process.argv[1] === File.callerFile().toString()) await this.cli.start(command, ...args);
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
