import Body from '../body.js';

let requestId = 0;

export default class ServerRequest extends Body {
  constructor (...args) {
    super(...args);
    this._requestId = undefined;
    this._url = undefined;
  }

  get headers () {
    return this.raw.headers;
  }

  get method () {
    return this.raw.method;
  }

  get protocol () {
    return this.isSecure ? 'https' : 'http';
  }

  get requestId () {
    if (this._requestId === undefined) {
      requestId = (requestId + 1) & 2147483647;
      this._requestId = `${process.pid}-${requestId}`;
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
