import assert from 'assert/strict';
import mock from './mock.js';

class TestClient {
  constructor (mock, options) {
    this.assert = assert;
    this._mock = mock;
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

  async _requestOk (method, ...args) {
    const res = await this._mock[method](...args);
    const body = await res.buffer();
    this.assert.ok(true, `${method.toUpperCase()} request`);
    return new TestResponse(this.assert, res, body);
  }
}

class TestResponse {
  constructor (assert, res, body) {
    this.assert = assert;
    this.res = res;
    this.body = body;
  }

  bodyIs (body) {
    this.assert.equal(this.body.toString(), body, 'body is equal');
    return this;
  }

  jsonIs (value) {
    this.assert.deepEqual(JSON.parse(this.body.toString()), value, 'JSON is equal');
    return this;
  }

  headerIs (name, value) {
    this.assert.equal(this.res.headers[name.toLowerCase()], value, `${name} header is equal`);
    return this;
  }

  statusIs (status) {
    this.assert.equal(this.res.status, status, `response status is ${status}`);
    return this;
  }
}

export default async function test (app, options = {}) {
  const client = await mock(app);
  return new TestClient(client, options);
}
