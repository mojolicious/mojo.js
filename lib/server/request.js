import Body from '../body.js';
import cookie from 'cookie';
import {decodeURIComponentSafe} from '../util.js';
import url from 'url';

let requestId = 0;

export default class ServerRequest extends Body {
  constructor (stream, options) {
    super(stream);
    this._baseURL = undefined;
    this._cookies = undefined;
    this._isPathSafe = undefined;
    this._path = undefined;
    this._protocol = undefined;
    this._remoteAddress = undefined;
    this._requestId = undefined;
    this._reverseProxy = options.reverseProxy;
    this._url = undefined;
    this._userinfo = undefined;
  }

  get baseURL () {
    if (this._baseURL === undefined) this._baseURL = `${this.protocol}://${this.raw.headers.host}`;
    return this._baseURL;
  }

  get (name) {
    return this.raw.headers[name.toLowerCase()];
  }

  getCookie (name) {
    if (this._cookies === undefined) {
      const header = this.get('Cookie');
      this._cookies = header === undefined ? {} : cookie.parse(header);
    }
    return this._cookies[name] ?? null;
  }

  get method () {
    return this.raw.method;
  }

  get path () {
    // eslint-disable-next-line node/no-deprecated-api
    if (this._path === undefined) this._path = decodeURIComponentSafe(url.parse(this.raw.url).pathname);
    return this._path;
  }

  get protocol () {
    if (this._protocol === undefined) {
      this._protocol = this.isSecure ? 'https' : 'http';
      if (this._reverseProxy === true) {
        const forwarded = this.get('X-Forwarded-Proto');
        if (forwarded !== undefined) this._protocol = forwarded;
      }
    }

    return this._protocol;
  }

  get query () {
    return this.url.searchParams;
  }

  get remoteAddress () {
    if (this._remoteAddress === undefined) {
      this._remoteAddress = this.raw.socket.remoteAddress;
      if (this._reverseProxy === true) {
        const forwarded = this.get('X-Forwarded-For');
        if (forwarded !== undefined) {
          const match = forwarded.match(/([^,\s]+)$/);
          if (match !== null) this._remoteAddress = match[1];
        }
      }
    }

    return this._remoteAddress;
  }

  get requestId () {
    if (this._requestId === undefined) {
      requestId = (requestId + 1) & 2147483647;
      this._requestId = `${process.pid}-${requestId.toString(36).padStart(6, '0')}`;
    }
    return this._requestId;
  }

  set requestId (id) {
    this._requestId = id;
  }

  get url () {
    if (this._url === undefined) this._url = new URL(this.raw.url, this.baseURL);
    return this._url;
  }

  get userinfo () {
    if (this._userinfo === undefined) {
      this._userinfo = null;
      const auth = this.get('Authorization');
      if (auth !== undefined) {
        const match = auth.match(/Basic (.+)$/);
        if (match !== null) this._userinfo = Buffer.from(match[1], 'base64');
      }
    }

    return this._userinfo;
  }
}
