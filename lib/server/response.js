import Stream from 'stream';

export default class ServerResponse {
  constructor (res) {
    this.raw = res;
  }

  body (body) {
    if (Buffer.isBuffer(body)) {
      this.set('Content-Length', body.length);
      this.end(body);
    } else if (body instanceof Stream) {
      body.pipe(this.raw);
    } else if (typeof val === 'string') {
      this.set('Content-Length', Buffer.byteLength(body));
      this.end(body);
    }
  }

  end (...args) {
    this.raw.end(...args);
  }

  set (name, value) {
    this.raw.setHeader(name, value);
  }

  get status () {
    return this.raw.statusCode;
  }

  set status (code) {
    this.raw.statusCode = code;
  }

  write (...args) {
    this.raw.write(...args);
  }
}
