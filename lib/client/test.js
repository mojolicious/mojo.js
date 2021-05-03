import assert from 'assert/strict';
import StackUtils from 'stack-utils';
import {MockClient} from './mock.js';

class TestClient extends MockClient {
  constructor (options = {}) {
    super(options);
    this.res = undefined;
    this.body = undefined;
    this._assert = assert;
    this._stack = new StackUtils();

    if (options.tap) {
      this._subtests = [this._assert = options.tap];
      this._assert.beforeEach(async t => {
        this._subtests.push(t);
        this._assert = t;
      });
      this._assert.afterEach(async t => {
        this._subtests.pop();
        this._assert = this._subtests[this._subtests.length - 1];
      });
    }
  }

  assert (name, args, msg, skip) {
    this._assert[name](...args, msg, {stack: this._stack.captureString(10, skip)});
  }

  bodyIs (body) {
    this.assert('equal', [this.body.toString(), body], 'body is equal', this.bodyIs);
    return this;
  }

  bodyLike (regex) {
    this.assert('match', [this.body.toString(), regex], 'body is similar', this.bodyLike);
    return this;
  }

  async deleteOk (...args) {
    return this._requestOk(this.deleteOk, 'delete', ...args);
  }

  done () {
    return this.stop();
  }

  async getOk (...args) {
    return this._requestOk(this.getOk, 'get', ...args);
  }

  async headOk (...args) {
    return this._requestOk(this.headOk, 'head', ...args);
  }

  headerIs (name, value) {
    this.assert('equal', [this.res.headers[name.toLowerCase()], value], `${name}: ${value}`, this.headerIs);
    return this;
  }

  headerLike (name, regex) {
    this.assert('match', [this.res.headers[name.toLowerCase()], regex], `${name} is similar`, this.headerLike);
    return this;
  }

  jsonIs (value) {
    this.assert('same', [JSON.parse(this.body.toString()), value], 'JSON body is equal', this.jsonIs);
    return this;
  }

  async optionsOk (...args) {
    return this._requestOk(this.optionsOk, 'options', ...args);
  }

  async patchOk (...args) {
    return this._requestOk(this.patchOk, 'patch', ...args);
  }

  async postOk (...args) {
    return this._requestOk(this.postOk, 'post', ...args);
  }

  async putOk (...args) {
    return this._requestOk(this.putOk, 'put', ...args);
  }

  statusIs (status) {
    this.assert('equal', [this.res.status, status], `response status is ${status}`, this.statusIs);
    return this;
  }

  async _requestOk (skip, method, url, options = {}) {
    this.res = await this[method](url, options);
    this.body = await this.res.buffer();
    this.assert('ok', [true], `${method.toUpperCase()} request for ${url}`, skip);
    return this;
  }
}

export default async function testClient (app, options = {}) {
  return new TestClient(options).start(app);
}
