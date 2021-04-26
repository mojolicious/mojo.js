import Body from '../body.js';

export default class ServerRequest extends Body {
  get headers () {
    return this.raw.headers;
  }

  get isSecure () {
    return !!this.socket.encrypted;
  }

  get method () {
    return this.raw.method;
  }

  get url () {
    if (!this._url) this._url = new URL(this.raw.url, `http://${this.headers.host}`);
    return this._url;
  }
}
