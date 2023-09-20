import type {App} from './app.js';
import type {ChildLogger} from './logger.js';
import type {Plan} from './router/plan.js';
import type {ServerRequest} from './server/request.js';
import type {ServerResponse} from './server/response.js';
import type {
  BackendInfo,
  MojoAction,
  MojoContext,
  MojoModels,
  MojoRenderOptions,
  MojoURLOptions,
  ScopedNestedHelpers,
  SessionData,
  UploadOptions,
  ValidatorFunction
} from './types.js';
import type {UserAgent} from './user-agent.js';
import type {WebSocket} from './websocket.js';
import type Path from '@mojojs/path';
import EventEmitter from 'node:events';
import querystring from 'node:querystring';
import {Params} from './body/params.js';
import {SafeString} from './util.js';

type WebSocketHandler = (ws: WebSocket) => void | Promise<void>;

interface ContextEvents {
  connection: (ws: WebSocket) => void;
  finish: () => void;
}

declare interface ContextEventEmitter {
  on: <T extends keyof ContextEvents>(event: T, listener: ContextEvents[T]) => this;
  emit: <T extends keyof ContextEvents>(event: T, ...args: Parameters<ContextEvents[T]>) => boolean;
}

const ABSOLUTE = /^[a-zA-Z][a-zA-Z0-9]*:\/\//;

/**
 * Context class.
 */
class Context extends EventEmitter implements ContextEventEmitter {
  /**
   * Application this context belongs to.
   */
  app: App;
  /**
   * Backend information for server that received the request.
   * @example
   * // Backend name (usually "server", "cgi", or "mock")
   * const {name} = ctx.backend;
   *
   * // Use low level Node.js APIs with "server" backend
   * const {res} = ctx.backend;
   * res.writeHead(200);
   * res.end('Hello World!');
   */
  backend: BackendInfo;
  /**
   * Partial content. Always returns at least an empty string, even for sections that have not been defined with
   * `ctx.contentFor()`.
   * @example
   * // Get content for "head" section
   * const head = ctx.content.head;
   */
  content: Record<string, string> = new Proxy(
    {},
    {
      get: function (target: Record<string, string>, name: string): SafeString {
        return new SafeString(target[name] ?? '');
      }
    }
  );
  /**
   * Format for HTTP exceptions ("html", "json", or "txt").
   */
  exceptionFormat: string;
  /**
   * WebSocket JSON mode.
   */
  jsonMode = false;
  /**
   * Logger with request id.
   * @example
   * // Pass logger with context to model
   * const log = ctx.log;
   * ctx.model.users.create({name: 'kraih'}, log);
   */
  log: ChildLogger;
  /**
   * Router dispatch plan.
   */
  plan: Plan | null = null;
  /**
   * HTTP request information.
   * @example
   * // Extract request information
   * const id      = ctx.req.requestId;
   * const method  = ctx.req.method;
   * const baseURL = ctx.req.baseURL;
   * const url     = ctx.req.url;
   * const query   = ctx.req.query;
   * const info    = ctx.req.userinfo;
   * const agent   = ctx.req.get('User-Agent');
   * const buffer  = await ctx.req.buffer();
   * const text    = await ctx.req.text();
   * const form    = await ctx.req.form();
   * const value   = await ctx.req.json();
   * const html    = await ctx.req.html();
   * const xml     = await ctx.req.xml();
   */
  req: ServerRequest;
  /**
   * HTTP response information.
   * @example
   * // Force file download by setting a response header
   * ctx.res.set('Content-Disposition', 'attachment; filename=foo.png;');
   *
   * // Make sure response is cached correctly
   * ctx.res.set('Cache-Control', 'public, max-age=300');
   * ctx.res.headers.append('Vary', 'Accept-Encoding');
   */
  res: ServerResponse;
  /**
   * Non-persistent data storage and exchange for the current request.
   */
  stash: Record<string, any> = {};

  _flash: SessionData | undefined = undefined;
  _nestedHelpersCache: Record<string, ScopedNestedHelpers> = {};
  _params: Params | undefined = undefined;
  _session: Record<string, any> | undefined = undefined;
  _ws: WeakRef<WebSocket> | null = null;

  constructor(app: App, req: ServerRequest, res: ServerResponse, backend: BackendInfo) {
    super({captureRejections: true});

    this.app = app;
    this.exceptionFormat = app.exceptionFormat;
    this.req = req;
    this.res = res;
    this.res.bindContext(this);
    this.backend = backend;
    this.log = app.log.child({requestId: this.req.requestId});
  }

  [EventEmitter.captureRejectionSymbol](error: Error): void {
    (this as unknown as MojoContext).exception(error);
  }

  /**
   * Select best possible representation for resource.
   */
  accepts(allowed?: string[]): string[] | null {
    const formats = this.app.mime.detect(this.req.get('Accept') ?? '');
    const {stash} = this;
    if (typeof stash.ext === 'string') formats.unshift(stash.ext);

    if (allowed === undefined) return formats.length > 0 ? formats : null;

    const results = formats.filter(format => allowed.includes(format));
    return results.length > 0 ? results : null;
  }

  /**
   * Application config shortcut.
   * @example
   * // Longer version
   * const config = ctx.app.config;
   */
  get config(): Record<string, any> {
    return this.app.config;
  }

  /**
   * Append partial content to `ctx.content` buffers.
   * @example
   * // Add content for "head" section
   * await ctx.contentFor('head', '<link rel="icon" href="/static/favicon.ico">');
   */
  async contentFor(
    name: string,
    content: string | SafeString | Promise<string | SafeString> | (() => Promise<string | SafeString>)
  ): Promise<void> {
    this.content[name] += await (content instanceof Function ? content() : content);
  }

  /**
   * Data storage persistent only for the next request.
   * @example
   * // Show message after redirect
   * const flash = await ctx.flash();
   * flash.message = 'User created successfully!';
   * await ctx.redirectTo('show_user', {values: {id: 23}});
   */
  async flash(): Promise<Record<string, any>> {
    if (this._flash === undefined) {
      const session = await this.session();
      this._flash = new Proxy(session, {
        get: function (target: SessionData, name: string): any {
          if (target.flash === undefined) return undefined;
          return target.flash[name];
        },
        set: function (target: SessionData, name: string, value: any): boolean {
          const nextFlash = target.nextFlash ?? {};
          nextFlash[name] = value;
          target.nextFlash = nextFlash;
          return true;
        }
      });
    }

    return this._flash;
  }

  /**
   * Handle WebSocket upgrade, used by servers.
   */
  handleUpgrade(ws: WebSocket): void {
    this._ws = new WeakRef(ws);
    this.emit('connection', ws);
    ws.on('error', error => (this as unknown as MojoContext).exception(error));
  }

  /**
   * Home directory shortcut.
   * @example
   * // Generate path
   * const path = ctx.home.child('views', 'foo', 'bar.html.tmpl');
   */
  get home(): Path {
    return this.app.home;
  }

  /**
   * Check if WebSocket connection has been accepted.
   */
  get isAccepted(): boolean {
    return this.listenerCount('connection') > 0;
  }

  /**
   * Check if WebSocket connection has been established.
   */
  get isEstablished(): boolean {
    return this._ws !== null;
  }

  /**
   * Check if session is active.
   */
  get isSessionActive(): boolean {
    return this._session !== undefined;
  }

  /**
   * Check if HTTP request is a WebSocket handshake.
   */
  get isWebSocket(): boolean {
    return this.req.isWebSocket;
  }

  /**
   * Accept WebSocket connection and activate JSON mode.
   * @example
   * // Echo WebSocket messages
   * ctx.json(async ws => {
   *   for await (const data of ws) {
   *     // Add a Futurama quote to JSON objects
   *     if (typeof data === 'object') {
   *       data.quote = 'Shut up and take my money!';
   *       await ws.send(data);
   *     }
   *   }
   * });
   */
  json(fn: WebSocketHandler): this {
    this.jsonMode = true;
    return this.on('connection', fn as () => void);
  }

  /**
   * Model shortcut.
   * @example
   * // Access arbitrary model objects
   * const db = await ctx.models.pg.db();
   */
  get models(): MojoModels {
    return this.app.models;
  }

  /**
   * GET and POST parameters.
   * @example
   * // Get a specific parameter
   * const params = await ctx.params();
   * const foo = params.get('foo');
   *
   * // Ignore all empty parameters
   * const params = await ctx.params({notEmpty: true});
   */
  async params(options: UploadOptions & {notEmpty?: boolean} = {}): Promise<Params> {
    if (this._params === undefined) {
      const req = this.req;
      const params = (this._params = new Params(req.query));
      for (const [name, value] of await req.form(options)) {
        params.append(name, value);
      }
    }

    return options.notEmpty === true ? this._params.removeEmpty() : this._params;
  }

  /**
   * Accept WebSocket connection.
   * @example
   * // Echo incoming WebSocket messages
   * ctx.plain(async ws => {
   *   for await (const message of ws) {
   *     await ws.send(`echo: ${message}`);
   *   }
   * });
   */
  plain(fn: WebSocketHandler): this {
    return this.on('connection', fn as () => void);
  }

  /**
   * Send `302` redirect response.
   * @example
   * // Moved Permanently
   * await ctx.redirect_to('some_route', {status: 301});
   */
  async redirectTo(target: string, options: MojoURLOptions & {status?: number} = {}): Promise<void> {
    await this.res
      .status(options.status ?? 302)
      .set('Location', this.urlFor(target, {absolute: true, ...options}) ?? '')
      .send();
  }

  /**
   * Render dynamic content.
   * @example
   * // Render text
   * await ctx.render({text: 'Hello World!'});
   *
   * // Render JSON
   * await ctx.render({json: {hello: 'world'}});
   *
   * // Render view "users/list.*.*" and pass it a stash value
   * await ctx.render({view: 'users/list'}, {foo: 'bar'});
   */
  async render(options: MojoRenderOptions = {}, stash?: Record<string, any>): Promise<boolean> {
    const {app} = this;
    if (stash !== undefined) Object.assign(this.stash, stash);
    await app.hooks.runHook('render:before', this, options);

    const result = await app.renderer.render(this as unknown as MojoContext, options);
    if (result === null) {
      if (options.maybe !== true) throw new Error('Nothing could be rendered');
      return false;
    }

    return await app.renderer.respond(this as unknown as MojoContext, result, {status: options.status});
  }

  /**
   * Try to render dynamic content to string.
   */
  async renderToString(options: MojoRenderOptions, stash?: Record<string, any>): Promise<string | null> {
    if (typeof options === 'string') options = {view: options};
    Object.assign(this.stash, stash);
    const result = await this.app.renderer.render(this as unknown as MojoContext, options);
    return result === null ? null : result.output.toString();
  }

  /**
   * Automatically select best possible representation for resource.
   */
  async respondTo(spec: Record<string, MojoAction | MojoRenderOptions>): Promise<void> {
    const formats = this.accepts() ?? [];

    let handler: MojoAction | MojoRenderOptions | undefined;
    for (const format of formats) {
      if (spec[format] === undefined) continue;
      handler = spec[format];
      break;
    }
    if (handler === undefined && spec.any !== undefined) handler = spec.any;

    if (handler !== undefined) {
      if (typeof handler === 'function') {
        await handler(this as unknown as MojoContext);
      } else {
        await this.render(handler);
      }
    }

    await this.res.status(204).send();
  }

  /**
   * Send static file.
   */
  async sendFile(file: Path): Promise<void> {
    return await this.app.static.serveFile(this as unknown as MojoContext, file);
  }

  /**
   * Get JSON schema validation function.
   */
  schema(schema: Record<string, any> | string): ValidatorFunction {
    return this.app.validator.schema(schema);
  }

  /**
   * Persistent data storage for the next few requests.
   */
  async session(): Promise<SessionData> {
    if (this._session === undefined) this._session = (await this.app.session.load(this)) ?? {};
    return this._session;
  }

  /**
   * HTTP/WebSocket user-agent shortcut.
   */
  get ua(): UserAgent {
    return this.app.ua;
  }

  /**
   * Generate URL for route or path.
   * @example
   * // Current URL with query parameter
   * const url = ctx.urlFor('current', {query: {foo: 'bar'}});
   *
   * // URL for route with placeholder values
   * const url = ctx.urlFor('users', {values: {id: 23}});
   *
   * // Absolute URL for path with fragment
   * const url = ctx.urlFor('/some/path', {absolute: true, fragment: 'whatever'});
   */
  urlFor(target?: string, options: MojoURLOptions = {}): string {
    if (target === undefined || target === 'current') {
      if (this.plan === null) throw new Error('No current route to generate URL for');
      const result = this.plan.render(options.values);
      return this._urlForPath(result.path, result.websocket, options);
    }

    if (target.startsWith('/')) return this._urlForPath(target, false, options);
    if (ABSOLUTE.test(target)) return target;

    const route = this.app.router.lookup(target);
    if (route === null) throw new Error('No route to generate URL for');
    return this._urlForPath(route.render(options.values), route.hasWebSocket(), options);
  }

  /**
   * Generate URL for static asset.
   */
  urlForAsset(path: string, options: MojoURLOptions = {}): string {
    return ABSOLUTE.test(path) === true ? path : this._urlForPath(this.app.static.assetPath(path), false, options);
  }

  /**
   * Generate URL for static file.
   */
  urlForFile(path: string, options: MojoURLOptions = {}): string {
    return ABSOLUTE.test(path) === true ? path : this._urlForPath(this.app.static.filePath(path), false, options);
  }

  /**
   * Generate URL for route or path and preserve the current query parameters.
   * @example
   * // Remove a specific query parameter
   * const url = ctx.urlWith('current', {query: {foo: null}});
   */
  urlWith(target?: string, options: MojoURLOptions = {}): string {
    options.query = Object.fromEntries(
      Object.entries({...this.req.query.toObject(), ...(options.query ?? {})}).filter(([, v]) => v !== null)
    );

    return this.urlFor(target, options);
  }

  /**
   * Established WebSocket connection.
   */
  get ws(): WebSocket | null {
    return this._ws?.deref() ?? null;
  }

  _urlForPath(path: string, isWebSocket: boolean, options: MojoURLOptions): string {
    path = this.req.basePath + (path === '' ? '/' : path);

    let queryFragment = '';
    if (options.query !== undefined && Object.keys(options.query).length > 0) {
      queryFragment = '?' + querystring.stringify(options.query);
    }

    if (options.fragment !== undefined) queryFragment += '#' + querystring.escape(options.fragment);

    if (options.absolute !== true && isWebSocket === false) return path + queryFragment;

    const url = this.req.baseURL + path + queryFragment;
    return isWebSocket ? url.replace(/^http/, 'ws') : url;
  }
}

export {Context};
