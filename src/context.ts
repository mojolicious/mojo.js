import type {App} from './app.js';
import type {Client} from './client.js';
import type {ChildLogger} from './logger.js';
import type {Plan} from './router/plan.js';
import type {
  MojoAction,
  MojoContext,
  MojoRenderOptions,
  MojoStash,
  ServerRequestOptions
} from './types.js';
import type {WebSocket} from './websocket.js';
import type Path from '@mojojs/path';
import type {ValidateFunction} from 'ajv';
import type http from 'http';
import EventEmitter from 'events';
import {Params} from './body/params.js';
import {ServerRequest} from './server/request.js';
import {ServerResponse} from './server/response.js';

type WebSocketHandler = (ws: WebSocket) => void | Promise<void>;

interface ContextEvents { connection: (ws: WebSocket) => void }

declare interface Context {
  on: <T extends keyof ContextEvents>(event: T, listener: ContextEvents[T]) => this,
  emit: <T extends keyof ContextEvents>(event: T, ...args: Parameters<ContextEvents[T]>) => boolean
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
  stash: MojoStash = {};
  _params: Params | undefined = undefined;
  _session: MojoStash | undefined = undefined;
  _ws: WeakRef<WebSocket> | null = null;

  constructor (app: App, req: http.IncomingMessage, res: http.ServerResponse, options: ServerRequestOptions) {
    super({captureRejections: true});

    this.app = app;
    this.exceptionFormat = app.exceptionFormat;
    this.req = new ServerRequest(req, options);
    this.res = new ServerResponse(res, this);
    this.log = app.log.child({requestId: this.req.requestId});
  }

  [EventEmitter.captureRejectionSymbol] (error: Error): void {
    (this as MojoContext).exception(error);
  }

  accepts (allowed?: string[]): string[] | null {
    const formats = this.app.mime.detect(this.req.headers.accept ?? '');
    const stash = this.stash;
    if (typeof stash.ext === 'string') formats.unshift(stash.ext);

    if (allowed === undefined) return formats.length > 0 ? formats : null;

    const results = formats.filter(format => allowed.includes(format));
    return results.length > 0 ? results : null;
  }

  get client (): Client {
    return this.app.client;
  }

  get config (): MojoStash {
    return this.app.config;
  }

  handleUpgrade (ws: WebSocket): void {
    this._ws = new WeakRef(ws);
    this.emit('connection', ws);
    ws.on('error', error => (this as MojoContext).exception(error));
  }

  get home (): Path {
    return this.app.home;
  }

  get isAccepted (): boolean {
    return this.listenerCount('connection') > 0;
  }

  get isEstablished (): boolean {
    return this._ws !== null;
  }

  get isSessionActive (): boolean {
    return this._session !== undefined;
  }

  get isWebSocket (): boolean {
    return this.req.isWebSocket;
  }

  json (fn: WebSocketHandler): this {
    this.jsonMode = true;
    return this.on('connection', fn as () => void);
  }

  get models (): MojoStash {
    return this.app.models;
  }

  async params (options: busboy.BusboyConfig): Promise<Params> {
    if (this._params === undefined) {
      const req = this.req;
      const params = this._params = new Params(req.query);
      for (const [name, value] of await req.form(options)) {
        params.append(name, value);
      }
    }

    return this._params;
  }

  plain (fn: WebSocketHandler): this {
    return this.on('connection', fn as () => void);
  }

  async redirectTo (target: string, options: {status?: number, values?: MojoStash} = {}): Promise<void> {
    await this.res.status(options.status ?? 302).set('Location', this.urlFor(target, options.values) ?? '').send();
  }

  async render (options: MojoRenderOptions = {}, stash?: MojoStash): Promise<boolean> {
    if (typeof options === 'string') options = {view: options};
    if (stash !== undefined) Object.assign(this.stash, stash);

    const app = this.app;
    const result = await app.renderer.render(this, options);
    if (result === null) {
      if (options.maybe !== true) throw new Error('Nothing could be rendered');
      return false;
    }

    const res = this.res;
    if (res.isSent) return false;
    if (options.status !== undefined) res.status(options.status);
    const type = app.mime.extType(result.format) ?? 'application/octet-stream';
    await res.type(type).send(result.output);

    return true;
  }

  async renderToString (options: MojoRenderOptions, stash?: MojoStash): Promise<string | null> {
    if (typeof options === 'string') options = {view: options};
    Object.assign(this.stash, stash);
    const result = await this.app.renderer.render(this, options);
    return result === null ? null : result.output.toString();
  }

  async respondTo (spec: Record<string, MojoAction>): Promise<void> {
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

  async sendFile (file: Path): Promise<void> {
    return await this.app.static.serveFile(this, file);
  }

  schema (schema: MojoStash | string): ValidateFunction | undefined {
    const validator = this.app.validator;
    if (typeof schema === 'string') return validator.getSchema(schema);

    if (schema.$id !== undefined) {
      const validate = validator.getSchema(schema.$id);
      if (validate !== undefined) return validate;
    }
    return validator.compile(schema);
  }

  async session (): Promise<MojoStash> {
    if (this._session === undefined) this._session = await this.app.session.load(this) ?? {};
    return this._session;
  }

  urlFor (target: string | undefined, values?: MojoStash): string | null {
    if (target === undefined || target === 'current') {
      if (this.plan === null) return null;
      const result = this.plan.render(values);
      return this._urlForPath(result.path, result.websocket);
    }

    if (target.startsWith('/')) return this.req.baseURL + target;
    if (ABSOLUTE.test(target)) return target;

    const route = this.app.router.lookup(target);
    if (route === null) return null;
    return this._urlForPath(route.render(values), route.hasWebSocket());
  }

  urlForFile (path: string): string {
    if (ABSOLUTE.test(path)) return path;
    return this.req.baseURL + this.app.static.filePath(path);
  }

  get ws (): WebSocket | null {
    return this._ws?.deref() ?? null;
  }

  _urlForPath (path: string, isWebSocket: boolean): string {
    const url = this.req.baseURL + path;
    return isWebSocket ? url.replace(/^http/, 'ws') : url;
  }
}

export {Context};
