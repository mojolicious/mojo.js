import assert from 'assert/strict';
import mock from './mock.js';

class TestClient {
  constructor (options) {
    this.assert = options.tap || assert;
    this.body = undefined;
    this.res = undefined;
    this._mock = undefined;

    if (options.tap) options.tap.beforeEach(async (done, t) => (this.assert = t));
  }

  bodyIs (body) {
    this.assert.equal(this.body.toString(), body, 'body is equal');
    return this;
  }

  done () {
    return this._mock.stop();
  }

  async getOk (...args) {
    return this._requestOk('get', ...args);
  }

  headerIs (name, value) {
    this.assert.equal(this.res.headers[name.toLowerCase()], value, `${name} header is equal`);
    return this;
  }

  async postOk (...args) {
    return this._requestOk('post', ...args);
  }

  async start (app) {
    this._mock = await mock(app);
    return this;
  }

  statusIs (status) {
    this.assert.equal(this.res.status, status, `response status is ${status}`);
    return this;
  }

  async _requestOk (method, ...args) {
    this.res = await this._mock[method](...args);
    this.body = await this.res.buffer();
    this.assert.ok(true, `${method.toUpperCase()} request`);
    return this;
  }
}

export default function test (app, options = {}) {
  return new TestClient(options).start(app);
}
