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

type WebSocketHandler = (ws: WebSocket) => void | Promise<void>;

interface ContextEvents {
  connection: (ws: WebSocket) => void;
}

declare interface Context {
  on: <T extends keyof ContextEvents>(event: T, listener: ContextEvents[T]) => this;
  emit: <T extends keyof ContextEvents>(event: T, ...args: Parameters<ContextEvents[T]>) => boolean;
}

const ABSOLUTE = /^[a-zA-Z][a-zA-Z0-9]*:\/\//;

class Context extends EventEmitter {
  app: App;
  exceptionFormat: string;
  jsonMode = false;
  log: ChildLogger;
  plan: Plan | null = null;
  req: ServerRequest;
  res: ServerResponse;
  stash: Record<string, any> = {};
  _flash: SessionData | undefined;
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

  accepts(allowed?: string[]): string[] | null {
    const formats = this.app.mime.detect(this.req.headers.accept ?? '');
    const stash = this.stash;
    if (typeof stash.ext === 'string') formats.unshift(stash.ext);

    if (allowed === undefined) return formats.length > 0 ? formats : null;

    const results = formats.filter(format => allowed.includes(format));
    return results.length > 0 ? results : null;
  }

  get config(): Record<string, any> {
    return this.app.config;
  }

  async flash(): Promise<Record<string, any>> {
    if (this._flash === undefined) {
      const session = await this.session();
      this._flash = new Proxy(session, {
        get: function (target: SessionData, name: string): any {
          if (target.flash === undefined) target.flash = {};
          return target.flash[name];
        },
        set: function (target: SessionData, name: string, value: any): boolean {
          if (target.nextFLash === undefined) target.nextFlash = {};
          (target.nextFlash as any)[name] = value;
          return true;
        }
      });
    }

    return this._flash;
  }

  handleUpgrade(ws: WebSocket): void {
    this._ws = new WeakRef(ws);
    this.emit('connection', ws);
    ws.on('error', error => (this as MojoContext).exception(error));
  }

  get home(): Path {
    return this.app.home;
  }

  get isAccepted(): boolean {
    return this.listenerCount('connection') > 0;
  }

  get isEstablished(): boolean {
    return this._ws !== null;
  }

  get isSessionActive(): boolean {
    return this._session !== undefined;
  }

  get isWebSocket(): boolean {
    return this.req.isWebSocket;
  }

  json(fn: WebSocketHandler): this {
    this.jsonMode = true;
    return this.on('connection', fn as () => void);
  }

  get models(): Record<string, any> {
    return this.app.models;
  }

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

  plain(fn: WebSocketHandler): this {
    return this.on('connection', fn as () => void);
  }

  async redirectTo(target: string, options: {status?: number; values?: Record<string, any>} = {}): Promise<void> {
    await this.res
      .status(options.status ?? 302)
      .set('Location', this.urlFor(target, options.values) ?? '')
      .send();
  }

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

  async renderToString(options: RenderOptions, stash?: Record<string, any>): Promise<string | null> {
    if (typeof options === 'string') options = {view: options};
    Object.assign(this.stash, stash);
    const result = await this.app.renderer.render(this, options);
    return result === null ? null : result.output.toString();
  }

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

  async sendFile(file: Path): Promise<void> {
    return await this.app.static.serveFile(this, file);
  }

  schema(schema: Record<string, any> | string): ValidatorFunction | null {
    return this.app.validator.schema(schema);
  }

  async session(): Promise<SessionData> {
    if (this._session === undefined) this._session = (await this.app.session.load(this)) ?? {};
    return this._session;
  }

  get ua(): UserAgent {
    return this.app.ua;
  }

  urlFor(target: string | undefined, values?: Record<string, any>): string | null {
    if (target === undefined || target === 'current') {
      if (this.plan === null) return null;
      const result = this.plan.render(values);
      return this._urlForPath(result.path, result.websocket);
    }

    if (target.startsWith('/')) return this.req.baseUrl + target;
    if (ABSOLUTE.test(target)) return target;

    const route = this.app.router.lookup(target);
    if (route === null) return null;
    return this._urlForPath(route.render(values), route.hasWebSocket());
  }

  urlForFile(path: string): string {
    if (ABSOLUTE.test(path)) return path;
    return this.req.baseUrl + this.app.static.filePath(path);
  }

  get ws(): WebSocket | null {
    return this._ws?.deref() ?? null;
  }

  _urlForPath(path: string, isWebSocket: boolean): string {
    const url = this.req.baseUrl + path;
    return isWebSocket ? url.replace(/^http/, 'ws') : url;
  }
}

export {Context};
