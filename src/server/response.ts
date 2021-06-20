import type Context from '../context.js';
import type http from 'http';
import Stream from 'stream';
import cookie from 'cookie';

export default class ServerResponse {
  headers: Record<string, string | string[]> = {};
  isSent = false;
  raw: http.ServerResponse;
  statusCode = 200;
  _ctx: WeakRef<Context> ;

  constructor (res: http.ServerResponse, ctx: Context) {
    this.raw = res;

    this._ctx = new WeakRef(ctx);
  }

  length (len: number): this {
    this.headers['Content-Length'] = len.toString();
    return this;
  }

  set (name: string, value: string): this {
    if (this.headers[name] !== undefined && name === 'Set-Cookie') {
      let header = this.headers[name];
      if (typeof header === 'string') header = this.headers[name] = [header];
      header.push(value);
    } else {
      this.headers[name] = value;
    }
    return this;
  }

  async send (body?: string | Buffer | Stream): Promise<void> {
    this.isSent = true;

    const ctx = this._ctx.deref();
    if (ctx === undefined) return;

    const app = ctx.app;
    if (ctx.isSessionActive) await app.session.store(ctx, await ctx.session());

    if (await app.hooks.runHook('send', ctx, body) === true) return;

    const raw = this.raw;
    if (typeof body === 'string' || Buffer.isBuffer(body)) {
      this.length(Buffer.byteLength(body));
      raw.writeHead(this.statusCode, this.headers);
      raw.end(body);
    } else if (body instanceof Stream) {
      raw.writeHead(this.statusCode, this.headers);
      body.pipe(this.raw);
    } else {
      raw.writeHead(this.statusCode, this.headers);
      raw.end();
    }
  }

  setCookie (name: string, value: string, options: cookie.CookieSerializeOptions): this {
    return this.set('Set-Cookie', cookie.serialize(name, value, options));
  }

  status (code: number): this {
    this.statusCode = code;
    return this;
  }

  type (type: string): this {
    this.headers['Content-Type'] = type;
    return this;
  }
}
