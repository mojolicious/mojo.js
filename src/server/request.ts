import type {ServerRequestOptions} from '../types.js';
import type {IncomingMessage} from 'http';
import {Body} from '../body.js';
import {Params} from '../body/params.js';
import {parseCookie} from '../server/cookie.js';
import {decodeURIComponentSafe} from '../util.js';

// Official regex from RFC 3986
const URL_RE = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;

let requestId = 0;

export class ServerRequest extends Body {
  isWebSocket: boolean;
  requestId: string;
  _cookies: Record<string, string> | undefined = undefined;
  _ip: string | undefined = undefined;
  _path: string | null | undefined = undefined;
  _protocol: string | undefined = undefined;
  _query: Params | undefined = undefined;
  _reverseProxy: boolean;
  _url: URL | undefined = undefined;
  _userinfo: string | null | undefined = undefined;

  constructor(stream: IncomingMessage, options: ServerRequestOptions) {
    super(stream);

    this.isWebSocket = options.isWebSocket;
    requestId = (requestId + 1) & 2147483647;
    this.requestId = `${process.pid}-${requestId.toString(36).padStart(6, '0')}`;

    this._reverseProxy = options.reverseProxy;
  }

  get baseURL(): string {
    return `${this.protocol}://${this.raw.headers.host ?? ''}`;
  }

  getCookie(name: string): string | null {
    if (this._cookies === undefined) {
      const header = this.headers.cookie;
      this._cookies = header === undefined ? {} : parseCookie(header);
    }
    return this._cookies[name] ?? null;
  }

  get ip(): string | null {
    if (this._ip === undefined) {
      this._ip = this.raw.socket.remoteAddress;
      if (this._reverseProxy) {
        const forwarded = this.get('X-Forwarded-For');
        if (forwarded !== undefined) {
          const match = forwarded.match(/([^,\s]+)$/);
          if (match !== null) this._ip = match[1];
        }
      }
    }

    return this._ip ?? null;
  }

  get method(): string | undefined {
    return this.raw.method;
  }

  get path(): string | null {
    if (this._path === undefined) {
      const match = (this.raw.url as string).match(URL_RE);
      this._path = match === null ? null : decodeURIComponentSafe(match[5]);
    }
    return this._path;
  }

  get protocol(): string {
    if (this._protocol === undefined) {
      this._protocol = this.isSecure ? 'https' : 'http';
      if (this._reverseProxy === true) {
        const forwarded = this.get('X-Forwarded-Proto');
        if (forwarded !== undefined) this._protocol = forwarded;
      }
    }

    return this._protocol;
  }

  get query(): Params {
    if (this._query === undefined) {
      const match = (this.raw.url as string).match(URL_RE);
      this._query = match === null ? new Params() : new Params(match[7]);
    }
    return this._query;
  }

  get userinfo(): string | null {
    if (this._userinfo === undefined) {
      this._userinfo = null;
      const auth = this.headers.authorization;
      if (auth !== undefined) {
        const match = auth.match(/Basic (.+)$/);
        if (match !== null) this._userinfo = Buffer.from(match[1], 'base64').toString();
      }
    }

    return this._userinfo;
  }
}
