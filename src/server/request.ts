import type {ServerRequestOptions} from '../types.js';
import type {IncomingMessage} from 'http';
import url from 'url';
import {Body} from '../body.js';
import {Params} from '../body/params.js';
import {decodeURIComponentSafe} from '../util.js';
import cookie from 'cookie';

let requestId = 0;

export class ServerRequest extends Body {
  isWebSocket: boolean;
  requestId: string;
  _baseURL: string | undefined = undefined;
  _cookies: Record<string, string> | undefined = undefined;
  _ip: string | undefined = undefined;
  _path: string | null | undefined = undefined;
  _protocol: string | undefined = undefined;
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
    if (this._baseURL === undefined) this._baseURL = `${this.protocol}://${this.raw.headers.host ?? ''}`;
    return this._baseURL;
  }

  getCookie(name: string): string | null {
    if (this._cookies === undefined) {
      const header = this.headers.cookie;
      this._cookies = header === undefined ? {} : cookie.parse(header);
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
    if (this._path === undefined) this._path = decodeURIComponentSafe(url.parse(this.raw.url as string).pathname ?? '');
    return this._path;
  }

  get protocol(): string {
    if (this._protocol === undefined) {
      this._protocol = this.isSecure ? 'https' : 'http';
      if (this._reverseProxy) {
        const forwarded = this.get('X-Forwarded-Proto');
        if (forwarded !== undefined) this._protocol = forwarded;
      }
    }

    return this._protocol;
  }

  get query(): Params {
    return new Params(this.url.searchParams as url.URLSearchParams);
  }

  get url(): URL {
    if (this._url === undefined) this._url = new URL(this.raw.url ?? '', this.baseURL);
    return this._url;
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
