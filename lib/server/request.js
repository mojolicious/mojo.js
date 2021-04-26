import Body from '../body.js';

export default class ServerRequest extends Body {
  get headers () {
    return this.raw.headers;
  }

  get method () {
    return this.raw.method;
  }

  get protocol () {
    return this.isSecure ? 'https' : 'http';
  }

  get url () {
    if (!this._url) this._url = new URL(this.raw.url, `${this.protocol}://${this.headers.host}`);
    return this._url;
  }
}
