import type App from './app.js';
import type Client from './client.js';
import type File from './file.js';
import type {ChildLogger} from './logger.js';
import type Plan from './router/plan.js';
import type {MojoStash, ServerRequestOptions} from './types.js';
import type {ValidateFunction} from 'ajv';
import type {IncomingMessage} from 'http';
import EventEmitter from 'events';
import Params from './body/params.js';
import ServerRequest from './server/request.js';

const ABSOLUTE = /^[a-zA-Z][a-zA-Z0-9]*:\/\//;

export default class Context extends EventEmitter {
  app: App;
  exceptionFormat: string;
  log: ChildLogger;
  plan: Plan | null = null;
  req: ServerRequest;
  stash: MojoStash = {};
  _params: Params | undefined = undefined;
  _session: MojoStash | undefined = undefined;

  constructor (app: App, req: IncomingMessage, options: ServerRequestOptions) {
    super({captureRejections: true});

    this.app = app;
    this.exceptionFormat = app.exceptionFormat;
    this.req = new ServerRequest(req, options);
    this.log = app.log.child({requestId: this.req.requestId});
  }

  [EventEmitter.captureRejectionSymbol] (error: Error): void {
    Context._handleException(this, error);
  }

  get client (): Client {
    return this.app.client;
  }

  get config (): MojoStash {
    return this.app.config;
  }

  get home (): File {
    return this.app.home;
  }

  get isSessionActive (): boolean {
    return this._session !== undefined;
  }

  get isWebSocket (): boolean {
    return false;
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

  schema (schema: any): ValidateFunction | undefined {
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

  _urlForPath (path: string, isWebSocket: boolean): string {
    const url = this.req.baseURL + path;
    return isWebSocket ? url.replace(/^http/, 'ws') : url;
  }

  static _handleException (ctx: any, error: Error): void {
    ctx.exception(error);
  }
}
