'use strict';

const cookie = require('cookie');
const Stream = require('stream');

class ServerResponse {
  constructor (res, ctx) {
    this.headers = {};
    this.isSent = false;
    this.raw = res;
    this.statusCode = 200;

    this._ctx = new WeakRef(ctx);
  }

  length (len) {
    this.headers['Content-Length'] = len;
    return this;
  }

  set (name, value) {
    if (this.headers[name] !== undefined && name === 'Set-Cookie') {
      if (typeof this.headers[name] === 'string') this.headers[name] = [this.headers[name]];
      this.headers[name].push(value);
    } else {
      this.headers[name] = value;
    }
    return this;
  }

  async send (body) {
    this.isSent = true;

    const ctx = this._ctx.deref();
    const app = ctx.app;
    if (ctx.isSessionActive === true) await app.session.store(ctx, await ctx.session());

    if (await app.hooks.runHook('send', ctx, body) === true) return;

    const raw = this.raw;
    if (typeof body === 'string' || Buffer.isBuffer(body)) {
      this.length(Buffer.byteLength(body));
      raw.writeHead(this.statusCode, this.headers, null);
      raw.end(body, null, null);
    } else if (body instanceof Stream) {
      raw.writeHead(this.statusCode, this.headers, null);
      body.pipe(this.raw);
    } else {
      raw.writeHead(this.statusCode, this.headers, null);
      raw.end(null, null, null);
    }
  }

  setCookie (name, value, options) {
    return this.set('Set-Cookie', cookie.serialize(name, value, options));
  }

  status (code) {
    this.statusCode = code;
    return this;
  }

  type (type) {
    this.headers['Content-Type'] = type;
    return this;
  }
}

module.exports = ServerResponse;
