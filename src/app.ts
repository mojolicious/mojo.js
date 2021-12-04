import type {Route} from './router/route.js';
import type {Server} from './server.js';
import type {
  AnyArguments,
  AppOptions,
  UserAgentOptions,
  MockRequestOptions,
  MojoAction,
  MojoContext,
  RouteArguments,
  ServerRequestOptions,
  TestUserAgentOptions
} from './types.js';
import type {IncomingMessage, ServerResponse} from 'http';
import {CLI} from './cli.js';
import {Context} from './context.js';
import {Hooks} from './hooks.js';
import {Logger} from './logger.js';
import {Mime} from './mime.js';
import {MockRequest} from './mock/request.js';
import {MockResponse} from './mock/response.js';
import ejsEnginePlugin from './plugins/ejs-engine.js';
import exceptionHelpersPlugin from './plugins/exception-helpers.js';
import headerConditionsPlugin from './plugins/header-conditions.js';
import viewHelpersPlugin from './plugins/view-helpers.js';
import {Renderer} from './renderer.js';
import {Router} from './router.js';
import {Session} from './session.js';
import {Static} from './static.js';
import {UserAgent} from './user-agent.js';
import {MockUserAgent} from './user-agent/mock.js';
import {TestUserAgent} from './user-agent/test.js';
import {Validator} from './validator.js';
import Path from '@mojojs/path';

const ContextWrapper = class extends Context {};

type AppHook = (app: App, ...args: any[]) => any;
type ContextHook = (app: MojoContext, ...args: any[]) => any;

export type Decoration = ((...args: any[]) => any) & {get?: () => any; set?: (value: any) => any};

export type Plugin = (app: App, options: Record<string, any>) => any;

export class App {
  cli: CLI = new CLI(this);
  config: Record<string, any>;
  detectImport: boolean;
  exceptionFormat: string;
  hooks: Hooks = new Hooks();
  home: Path = new Path();
  log: Logger;
  mime: Mime = new Mime();
  models: Record<string, any> = {};
  renderer: Renderer = new Renderer();
  router: Router = new Router();
  secrets: string[];
  session: Session = new Session(this);
  static: Static = new Static();
  ua: UserAgent = new UserAgent();
  validator = new Validator();
  _contextClass: any = class extends ContextWrapper {};
  _mode: string;
  _server: WeakRef<Server> | null = null;

  constructor(options: AppOptions = {}) {
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

  addAppHook(name: string, fn: AppHook): this {
    this.hooks.addHook(name, fn);
    return this;
  }

  addContextHook(name: string, fn: ContextHook): this {
    this.hooks.addHook(name, fn);
    return this;
  }

  addHelper(name: string, fn: MojoAction): this {
    return this.decorateContext(name, function (this: MojoContext, ...args: any[]) {
      return fn(this, ...args);
    });
  }

  any(...args: AnyArguments): Route {
    return this.router.any(...args);
  }

  decorateContext(name: string, fn: Decoration): this {
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

  delete(...args: RouteArguments): Route {
    return this.router.delete(...args);
  }

  get(...args: RouteArguments): Route {
    return this.router.get(...args);
  }

  async handleRequest(ctx: MojoContext): Promise<void> {
    if (ctx.isWebSocket) {
      if ((await this.hooks.runHook('websocket', ctx)) === true) return;
      await this.router.dispatch(ctx);
      return;
    }

    if ((await this.hooks.runHook('request', ctx)) === true) return;
    if (await this.static.dispatch(ctx)) return;
    if (await this.router.dispatch(ctx)) return;
    await ctx.notFound();
  }

  get mode(): string {
    return this._mode;
  }

  newContext(req: IncomingMessage, res: ServerResponse, options: ServerRequestOptions): MojoContext {
    return new this._contextClass(this, req, res, options);
  }

  newMockContext(options?: MockRequestOptions): MojoContext {
    const req = new MockRequest(options);
    return new this._contextClass(this, req, new MockResponse(req), {isReverseProxy: false, isWebSocket: false});
  }

  async newMockUserAgent(options?: UserAgentOptions): Promise<MockUserAgent> {
    return await MockUserAgent.newMockUserAgent(this, options);
  }

  async newTestUserAgent(options?: TestUserAgentOptions): Promise<TestUserAgent> {
    return await TestUserAgent.newTestUserAgent(this, options);
  }

  options(...args: RouteArguments): Route {
    return this.router.options(...args);
  }

  patch(...args: RouteArguments): Route {
    return this.router.patch(...args);
  }

  plugin(plugin: Plugin, options: Record<string, any> = {}): any {
    return plugin(this, options);
  }

  post(...args: RouteArguments): Route {
    return this.router.post(...args);
  }

  put(...args: RouteArguments): Route {
    return this.router.put(...args);
  }

  get server(): Server | null {
    return this._server?.deref() ?? null;
  }

  set server(server: Server | null) {
    this._server = server === null ? null : new WeakRef(server);
  }

  start(command?: string, ...args: string[]): void {
    if (this.detectImport && process.argv[1] !== Path.callerFile().toString()) return;
    this.cli.start(command, ...args).catch(error => this.log.error(error.message));
  }

  under(...args: AnyArguments): Route {
    return this.router.under(...args);
  }

  async warmup(): Promise<void> {
    await this.renderer.warmup();
    await this.router.warmup();
  }

  websocket(...args: RouteArguments): Route {
    return this.router.websocket(...args);
  }
}
