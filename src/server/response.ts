import type {Context} from '../context.js';
import type {CookieOptions} from '../types.js';
import type http from 'http';
import {Stream} from 'stream';
import {stringifyCookie} from './cookie.js';

/**
 * Server response class.
 */
export class ServerResponse {
  /**
   * Response headers.
   */
  headers: Record<string, string | string[]> = {};
  /**
   * Response has already been sent.
   */
  isSent = false;
  /**
   * Response status.
   */
  statusCode = 200;

  _ctx: WeakRef<Context>;
  _raw: http.ServerResponse;

  constructor(res: http.ServerResponse, ctx: Context) {
    this._ctx = new WeakRef(ctx);
    this._raw = res;
  }

  /**
   * Append header value.
   */
  append(name: string, value: string) {
    const headers = this.headers;
    const old = headers[name];

    if (old === undefined) {
      headers[name] = value;
    } else if (Array.isArray(old)) {
      old.push(value);
    } else {
      headers[name] = [old, value];
    }

    return this;
  }

  /**
   * Set response content length.
   */
  length(len: number): this {
    this.headers['Content-Length'] = len.toString();
    return this;
  }

  /**
   * Send response.
   */
  async send(body?: string | Buffer | Stream): Promise<void> {
    this.isSent = true;

    const ctx = this._ctx.deref();
    if (ctx === undefined) return;

    const app = ctx.app;
    const newBody = await app.hooks.runHook('send:before', ctx, body);
    if (newBody !== undefined) body = newBody;

    if (ctx.isSessionActive === true) await app.session.store(ctx, await ctx.session());

    const raw = this._raw;
    if (typeof body === 'string' || Buffer.isBuffer(body)) {
      this.length(Buffer.byteLength(body));
      raw.writeHead(this.statusCode, this.headers);
      raw.end(body);
    } else if (body instanceof Stream) {
      raw.writeHead(this.statusCode, this.headers);
      body.pipe(this._raw);
    } else {
      raw.writeHead(this.statusCode, this.headers);
      raw.end();
    }
  }

  /**
   * Set HTTP header for response.
   */
  set(name: string, value: string): this {
    if (this.headers[name] !== undefined && name === 'Set-Cookie') {
      let header = this.headers[name];
      if (typeof header === 'string') header = this.headers[name] = [header];
      header.push(value);
    } else {
      this.headers[name] = value;
    }
    return this;
  }

  /**
   * Set cookie value.
   */
  setCookie(name: string, value: string, options: CookieOptions): this {
    return this.set('Set-Cookie', stringifyCookie(name, value, options));
  }

  /**
   * Set response status.
   */
  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  /**
   * Set response content type.
   */
  type(type: string): this {
    this.headers['Content-Type'] = type;
    return this;
  }
}
