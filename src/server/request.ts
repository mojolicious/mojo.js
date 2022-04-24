import type {ServerRequestOptions} from '../types.js';
import type {IncomingMessage} from 'http';
import type {Socket} from 'net';
import {Body} from '../body.js';
import {Params} from '../body/params.js';
import {parseCookie} from '../server/cookie.js';
import {decodeURIComponentSafe} from '../util.js';

type TLSSocket = Socket & {encrypted: boolean | undefined};

// Official regex from RFC 3986
const URL_RE = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;

let requestId = 0;

/**
 * Server request class.
 */
export class ServerRequest extends Body {
  /**
   * Request is a WebSocket handshake.
   */
  isWebSocket: boolean;
  /**
   * Request ID.
   */
  requestId: string;

  _cookies: Record<string, string> | undefined = undefined;
  _ip: string | undefined = undefined;
  _path: string | null | undefined = undefined;
  _protocol: string | undefined = undefined;
  _query: Params | undefined = undefined;
  _reverseProxy: boolean;
  _userinfo: string | null | undefined = undefined;

  constructor(stream: IncomingMessage, options: ServerRequestOptions) {
    super(stream);

    this.isWebSocket = options.isWebSocket;
    requestId = (requestId + 1) & 2147483647;
    this.requestId = `${process.pid}-${requestId.toString(36).padStart(6, '0')}`;

    this._reverseProxy = options.reverseProxy;
  }

  /**
   * Server base URL.
   */
  get baseURL(): string {
    return `${this.protocol}://${this._raw.headers.host ?? ''}`;
  }

  /**
   * Get cookie value.
   */
  getCookie(name: string): string | null {
    if (this._cookies === undefined) {
      const header = this.headers.cookie;
      this._cookies = header === undefined ? {} : parseCookie(header);
    }
    return this._cookies[name] ?? null;
  }

  /**
   * Remote IP address.
   */
  get ip(): string | null {
    if (this._ip === undefined) {
      this._ip = this._raw.socket.remoteAddress;
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

  /**
   * Check if underlying socket was encrypted with TLS.
   */
  get isSecure(): boolean {
    const socket = this._raw.socket as TLSSocket;
    return socket.encrypted ?? false;
  }

  /**
   * Request method.
   */
  get method(): string | null {
    return this._raw.method ?? null;
  }

  /**
   * Request path.
   */
  get path(): string | null {
    if (this._path === undefined) {
      const match = (this._raw.url as string).match(URL_RE);
      this._path = match === null ? null : decodeURIComponentSafe(match[5]);
    }
    return this._path;
  }

  /**
   * Request protocol.
   */
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

  /**
   * Query parameters.
   */
  get query(): Params {
    if (this._query === undefined) {
      const url = this._raw.url as string;
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
      const auth = this.headers.authorization;
      if (auth !== undefined) {
        const match = auth.match(/Basic (.+)$/);
        if (match !== null) this._userinfo = Buffer.from(match[1], 'base64').toString();
      }
    }

    return this._userinfo;
  }
}
