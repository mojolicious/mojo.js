import cookie from 'cookie';
import Stream from 'stream';

export default class ServerResponse {
  constructor (res) {
    this.raw = res;
    this._headers = {};
    this._status = undefined;
  }

  set (name, value) {
    this._headers[name] = value;
    return this;
  }

  send (body) {
    if (Buffer.isBuffer(body)) {
      const length = Buffer.byteLength(body);
      this.raw.writeHead(this._status, {'Content-Length': length, ...this._headers}, null);
      this.raw.end(body, null, null);
    } else if (body instanceof Stream) {
      this.raw.writeHead(this._status, this._headers, null);
      body.pipe(this.raw);
    } else {
      this.raw.writeHead(this._status, this._headers, null);
      this.raw.end(null, null, null);
    }
  }

  setCookie (name, value, options) {
    return this.set('Set-Cookie', cookie.serialize(name, value, options));
  }

  status (code) {
    this._status = code;
    return this;
  }
}
