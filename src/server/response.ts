import type {Context} from '../context.js';
import type {CookieOptions} from '../types.js';
import type {Stream} from 'node:stream';
import {stringifyCookie} from './cookie.js';
import {Headers} from '../headers.js';

type SendResponse = (res: ServerResponse, body?: string | Buffer | Stream) => void;

/**
 * Server response class.
 */
export class ServerResponse {
  /**
   * Response headers.
   */
  headers = new Headers();
  /**
   * Response has already been sent.
   */
  isSent = false;
  /**
   * Response status code.
   */
  statusCode = 200;
  /**
   * Response status message.
   */
  statusMessage: string | null = null;

  _ctx: WeakRef<Context> | undefined = undefined;
  _sendResponse: SendResponse;

  constructor(sendResponse: SendResponse) {
    this._sendResponse = sendResponse;
  }

  /**
   * Append header value.
   */
  append(name: string, value: string) {
    this.headers.append(name, value);
    return this;
  }

  /**
   * Bind context to response.
   */
  bindContext(ctx: Context): void {
    this._ctx = new WeakRef(ctx);
  }

  /**
   * Set response content length.
   */
  length(len: number): this {
    return this.set('Content-Length', len.toString());
  }

  /**
   * Send response.
   */
  async send(body?: string | Buffer | Stream): Promise<void> {
    this.isSent = true;

    const ctxRef = this._ctx;
    if (ctxRef === undefined) return;
    const ctx = ctxRef.deref();
    if (ctx === undefined) return;

    const app = ctx.app;
    const newBody = await app.hooks.runHook('send:before', ctx, body);
    if (newBody !== undefined) body = newBody;

    if (ctx.isSessionActive === true) await app.session.store(ctx, await ctx.session());

    this._sendResponse(this, body);
  }

  /**
   * Set HTTP header for response.
   */
  set(name: string, value: string): this {
    this.headers.set(name, value);
    return this;
  }

  /**
   * Set cookie value.
   */
  setCookie(name: string, value: string, options: CookieOptions): this {
    return this.append('Set-Cookie', stringifyCookie(name, value, options));
  }

  /**
   * Set response status.
   */
  status(code: number, message?: string): this {
    this.statusCode = code;
    if (message !== undefined) this.statusMessage = message;
    return this;
  }

  /**
   * Set response content type.
   */
  type(type: string): this {
    return this.set('Content-Type', type);
  }
}
