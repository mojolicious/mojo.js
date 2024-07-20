import type {ServerRequestOptions} from '../types.js';
import {Params} from '../body/params.js';
import {Body} from '../body.js';
import {parseCookie} from '../server/cookie.js';
import {decodeURIComponentSafe} from '@mojojs/util';

// Official regex from RFC 3986
const URL_RE = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;

let requestId = 0;

/**
 * Server request class.
 */
export class ServerRequest extends Body {
  /**
   * Request base path.
   */
  basePath = '';
  /**
   * Check if underlying socket was encrypted with TLS.
   */
  isSecure: boolean;
  /**
   * Request is a WebSocket handshake.
   */
  isWebSocket: boolean;
  /**
   * Request method.
   */
  method: string | null;
  /**
   * Request path.
   */
  path = '/';
  /**
   * Peer address.
   */
  remoteAddress: string | null;
  /**
   * Request ID.
   */
  requestId: string;
  /**
   * Reverse proxy support is activated.
   */
  reverseProxy: boolean;
  /**
   * Request URL.
   */
  url: string | null;

  _cookies: Record<string, string> | undefined = undefined;
  _ip: string | null | undefined = undefined;
  _protocol: string | undefined = undefined;
  _query: Params | undefined = undefined;
  _userinfo: string | null | undefined = undefined;

  constructor(options: ServerRequestOptions) {
    super(options.headers, options.body);

    this.method = options.method ?? null;
    const url = (this.url = options.url ?? null);

    const pathMatch = (url ?? '').match(URL_RE);
    this.path = pathMatch === null ? '' : (decodeURIComponentSafe(pathMatch[5]) ?? '');

    this.isWebSocket = options.isWebSocket;
    this.isSecure = options.isSecure;

    requestId = (requestId + 1) & 2147483647;
    this.requestId = `${process.pid}-${requestId.toString(36).padStart(6, '0')}`;

    this.remoteAddress = options.remoteAddress ?? null;
    this.reverseProxy = options.reverseProxy;
  }

  /**
   * Server base URL.
   */
  get baseURL(): string {
    return `${this.protocol}://${this.get('Host') ?? ''}`;
  }

  /**
   * Get cookie value.
   */
  getCookie(name: string): string | null {
    if (this._cookies === undefined) {
      const header = this.get('Cookie');
      this._cookies = header === null ? {} : parseCookie(header);
    }
    return this._cookies[name] ?? null;
  }

  /**
   * Remote IP address. Uses he `X-Forwarded-For` header value if reverse proxy support is activated.
   */
  get ip(): string | null {
    if (this._ip === undefined) {
      this._ip = this.remoteAddress;
      if (this.reverseProxy === true) {
        const forwarded = this.get('X-Forwarded-For');
        if (forwarded !== null) {
          const match = forwarded.match(/([^,\s]+)$/);
          if (match !== null) this._ip = match[1];
        }
      }
    }

    return this._ip;
  }

  /**
   * Request protocol. Uses the `X-Forwarded-Proto` header value if reverse proxy support is activated.
   */
  get protocol(): string {
    if (this._protocol === undefined) {
      this._protocol = this.isSecure ? 'https' : 'http';
      if (this.reverseProxy === true) {
        const forwarded = this.get('X-Forwarded-Proto');
        if (forwarded !== null) this._protocol = forwarded;
      }
    }

    return this._protocol;
  }

  /**
   * Query parameters.
   */
  get query(): Params {
    if (this._query === undefined) {
      const url = this.url ?? '';
      if (url.includes('?') === true) {
        const match = url.match(URL_RE);
        this._query = match !== null ? new Params(match[7]) : new Params();
      } else {
        this._query = new Params();
      }
    }
    return this._query;
  }

  /**
   * User info.
   */
  get userinfo(): string | null {
    if (this._userinfo === undefined) {
      this._userinfo = null;
      const auth = this.get('Authorization');
      if (auth !== null) {
        const match = auth.match(/Basic (.+)$/);
        if (match !== null) this._userinfo = Buffer.from(match[1], 'base64').toString();
      }
    }

    return this._userinfo;
  }
}
