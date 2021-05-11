import Body from '../body.js';
import cookie from 'cookie';
import {decodeURIComponentSafe} from '../util.js';
import url from 'url';

let requestId = 0;

export default class ServerRequest extends Body {
  constructor (stream) {
    super(stream);
    this._baseURL = undefined;
    this._cookies = undefined;
    this._isPathSafe = undefined;
    this._path = undefined;
    this._requestId = undefined;
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
    return this.isSecure ? 'https' : 'http';
  }

  get query () {
    return this.url.searchParams;
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
