import url from 'url';
import Body from '../body.js';
import {decodeURIComponentSafe} from '../util.js';

let requestId = 0;

export default class ServerRequest extends Body {
  constructor (...args) {
    super(...args);
    this._isPathSafe = undefined;
    this._path = undefined;
    this._requestId = undefined;
    this._url = undefined;
  }

  get headers () {
    return this.raw.headers;
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
    if (this._url === undefined) this._url = new URL(this.raw.url, `${this.protocol}://${this.headers.host}`);
    return this._url;
  }
}
