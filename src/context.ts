import type {App} from './app.js';
import type {ChildLogger} from './logger.js';
import type {Plan} from './router/plan.js';
import type {SessionData} from './types.js';
import type {MojoAction, MojoContext, RenderOptions, ServerRequestOptions, ValidatorFunction} from './types.js';
import type {UserAgent} from './user-agent.js';
import type {WebSocket} from './websocket.js';
import type Path from '@mojojs/path';
import type {BusboyConfig} from 'busboy';
import type http from 'http';
import EventEmitter from 'events';
import {Params} from './body/params.js';
import {ServerRequest} from './server/request.js';
import {ServerResponse} from './server/response.js';
import {SafeString} from './util.js';

type URLOptions = {query?: Record<string, string>};

type WebSocketHandler = (ws: WebSocket) => void | Promise<void>;

interface ContextEvents {
  connection: (ws: WebSocket) => void;
}

declare interface Context {
  on: <T extends keyof ContextEvents>(event: T, listener: ContextEvents[T]) => this;
  emit: <T extends keyof ContextEvents>(event: T, ...args: Parameters<ContextEvents[T]>) => boolean;
}

const ABSOLUTE = /^[a-zA-Z][a-zA-Z0-9]*:\/\//;

/**
 * Context class.
 */
class Context extends EventEmitter {
  /**
   * Application this context belongs to.
   */
  app: App;
  /**
   * Partial content.
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
   * Format for HTTP exceptions.
   */
  exceptionFormat: string;
  /**
   * WebSocket JSON mode.
   */
  jsonMode = false;
  /**
   * Logger with request id.
   */
  log: ChildLogger;
  /**
   * Router dispatch plan.
   */
  plan: Plan | null = null;
  /**
   * HTTP request information.
   */
  req: ServerRequest;
  /**
   * HTTP response information.
   */
  res: ServerResponse;
  /**
   * Non-persistent data storage and exchange for the current request.
   */
  stash: Record<string, any> = {};

  _flash: SessionData | undefined = undefined;
  _params: Params | undefined = undefined;
  _session: Record<string, any> | undefined = undefined;
  _ws: WeakRef<WebSocket> | null = null;

  constructor(app: App, req: http.IncomingMessage, res: http.ServerResponse, options: ServerRequestOptions) {
    super({captureRejections: true});

    this.app = app;
    this.exceptionFormat = app.exceptionFormat;
    this.req = new ServerRequest(req, options);
    this.res = new ServerResponse(res, this);
    this.log = app.log.child({requestId: this.req.requestId});
  }

  [EventEmitter.captureRejectionSymbol](error: Error): void {
    (this as MojoContext).exception(error);
  }

  /**
   * Select best possible representation for resource.
   */
  accepts(allowed?: string[]): string[] | null {
    const formats = this.app.mime.detect(this.req.get('Accept') ?? '');
    const stash = this.stash;
    if (typeof stash.ext === 'string') formats.unshift(stash.ext);

    if (allowed === undefined) return formats.length > 0 ? formats : null;

    const results = formats.filter(format => allowed.includes(format));
    return results.length > 0 ? results : null;
  }

  /**
   * Application config shortcut.
   */
  get config(): Record<string, any> {
    return this.app.config;
  }

  /**
   * Append partial content to `ctx.content` buffers.
   */
  async contentFor(name: string, content: string | SafeString): Promise<void> {
    this.content[name] += content;
  }

  /**
   * Data storage persistent only for the next request.
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
    ws.on('error', error => (this as MojoContext).exception(error));
  }

  /**
   * Home directory shortcut.
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
   */
  json(fn: WebSocketHandler): this {
    this.jsonMode = true;
    return this.on('connection', fn as () => void);
  }

  /**
   * Model shortcut.
   */
  get models(): Record<string, any> {
    return this.app.models;
  }

  /**
   * GET and POST parameters.
   */
  async params(options?: BusboyConfig): Promise<Params> {
    if (this._params === undefined) {
      const req = this.req;
      const params = (this._params = new Params(req.query));
      for (const [name, value] of await req.form(options)) {
        params.append(name, value);
      }
    }

    return this._params;
  }

  /**
   * Accept WebSocket connection.
   */
  plain(fn: WebSocketHandler): this {
    return this.on('connection', fn as () => void);
  }

  /**
   * Send `302` redirect response.
   */
  async redirectTo(target: string, options: {status?: number; values?: Record<string, any>} = {}): Promise<void> {
    await this.res
      .status(options.status ?? 302)
      .set('Location', this.urlFor(target, options.values) ?? '')
      .send();
  }

  /**
   * Render dynamic content.
   */
  async render(options: RenderOptions = {}, stash?: Record<string, any>): Promise<boolean> {
    if (typeof options === 'string') options = {view: options};
    if (stash !== undefined) Object.assign(this.stash, stash);

    const app = this.app;
    const result = await app.renderer.render(this, options);
    if (result === null) {
      if (options.maybe !== true) throw new Error('Nothing could be rendered');
      return false;
    }

    return await app.renderer.respond(this, result, {status: options.status});
  }

  /**
   * Try to render dynamic content to string.
   */
  async renderToString(options: RenderOptions, stash?: Record<string, any>): Promise<string | null> {
    if (typeof options === 'string') options = {view: options};
    Object.assign(this.stash, stash);
    const result = await this.app.renderer.render(this, options);
    return result === null ? null : result.output.toString();
  }

  /**
   * Automatically select best possible representation for resource.
   */
  async respondTo(spec: Record<string, MojoAction>): Promise<void> {
    const formats = this.accepts() ?? [];

    for (const format of formats) {
      if (spec[format] === undefined) continue;
      await spec[format](this);
      return;
    }

    if (spec.any !== undefined) {
      await spec.any(this);
      return;
    }

    await this.res.status(204).send();
  }

  /**
   * Send static file.
   */
  async sendFile(file: Path): Promise<void> {
    return await this.app.static.serveFile(this, file);
  }

  /**
   * Get JSON schema validation function.
   */
  schema(schema: Record<string, any> | string): ValidatorFunction | null {
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
   * HTTP/WebSocket user agent shortcut.
   */
  get ua(): UserAgent {
    return this.app.ua;
  }

  /**
   * Generate URL for route of path.
   */
  urlFor(target: string | undefined, values?: Record<string, any>, options: URLOptions = {}): string | null {
    if (target === undefined || target === 'current') {
      if (this.plan === null) return null;
      const result = this.plan.render(values);
      return this._urlForPath(result.path, result.websocket, options);
    }

    if (target.startsWith('/')) return this._urlForPath(target, false, options);
    if (ABSOLUTE.test(target)) return target;

    const route = this.app.router.lookup(target);
    if (route === null) return null;
    return this._urlForPath(route.render(values), route.hasWebSocket(), options);
  }

  /**
   * Generate URL for static file.
   */
  urlForFile(path: string): string {
    if (ABSOLUTE.test(path)) return path;
    return this.req.baseURL + this.app.static.filePath(path);
  }

  /**
   * Established WebSocket connection.
   */
  get ws(): WebSocket | null {
    return this._ws?.deref() ?? null;
  }

  _urlForPath(path: string, isWebSocket: boolean, options: URLOptions): string {
    const query = options.query === undefined ? '' : '?' + new Params(options.query).toString();
    const url = this.req.baseURL + path + query;
    return isWebSocket ? url.replace(/^http/, 'ws') : url;
  }
}

export {Context};
