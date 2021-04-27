import assert from 'assert/strict';
import mock from './mock.js';

class TestClient {
  constructor (options) {
    this.assert = assert;
    this.body = undefined;
    this.res = undefined;
    this._mock = undefined;
    this._stack = [];

    if (options.tap) {
      this._stack.push(this.assert = options.tap);
      options.tap.beforeEach(async (done, t) => {
        this._stack.push(t);
        this.assert = t;
      });
      options.tap.afterEach(async (done, t) => {
        this._stack.pop();
        this.assert = this._stack[this._stack.length - 1];
      });
    }
  }

  bodyIs (body) {
    this.assert.equal(this.body.toString(), body, 'body is equal');
    return this;
  }

  async deleteOk (...args) {
    return this._requestOk('delete', ...args);
  }

  done () {
    return this._mock.stop();
  }

  async getOk (...args) {
    return this._requestOk('get', ...args);
  }

  async headOk (...args) {
    return this._requestOk('head', ...args);
  }

  headerIs (name, value) {
    this.assert.equal(this.res.headers[name.toLowerCase()], value, `${name} header is equal`);
    return this;
  }

  async optionsOk (...args) {
    return this._requestOk('options', ...args);
  }

  async patchOk (...args) {
    return this._requestOk('patch', ...args);
  }

  async postOk (...args) {
    return this._requestOk('post', ...args);
  }

  async putOk (...args) {
    return this._requestOk('put', ...args);
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
