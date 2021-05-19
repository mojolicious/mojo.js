import assert from 'assert/strict';
import ClientResponse from '../client/response.js';
import MockClient from './mock.js';
import {on} from 'events';
import StackUtils from 'stack-utils';

export default class TestClient extends MockClient {
  constructor (options) {
    super(options);
    this.body = undefined;
    this.res = undefined;
    this.ws = undefined;
    this._assert = assert;
    this._finished = undefined;
    this._messages = undefined;
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

  bodyUnlike (regex) {
    this.assert('notMatch', [this.body.toString(), regex], 'body is not similar', this.bodyLike);
    return this;
  }

  async deleteOk (url, options) {
    return this._requestOk(this.deleteOk, 'delete', url, options);
  }

  async getOk (url, options) {
    return this._requestOk(this.getOk, 'get', url, options);
  }

  async finishOk (code, reason) {
    this.ws.close(code, reason);
    await this._waitFinished();
    this.assert('ok', [true], 'closed WebSocket', this.finishOk);
  }

  async finishedOk (code) {
    await this._waitFinished();
    this.assert('equal', [this._finished[0], code], `WebSocket closed with status ${code}`);
  }

  async headOk (url, options) {
    return this._requestOk(this.headOk, 'head', url, options);
  }

  headerExists (name) {
    this.assert('ok', [this.res.get(name) !== undefined], `header "${name}" exists`, this.headerExists);
    return this;
  }

  headerExistsNot (name) {
    this.assert('notOk', [this.res.get(name) !== undefined], `no "${name}" header`, this.headerExistsNot);
    return this;
  }

  headerIs (name, value) {
    this.assert('equal', [this.res.get(name), value], `${name}: ${value}`, this.headerIs);
    return this;
  }

  headerLike (name, regex) {
    this.assert('match', [this.res.get(name), regex], `${name} is similar`, this.headerLike);
    return this;
  }

  jsonIs (value) {
    this.assert('same', [JSON.parse(this.body.toString()), value], 'JSON body is equal', this.jsonIs);
    return this;
  }

  async optionsOk (url, options) {
    return this._requestOk(this.optionsOk, 'options', url, options);
  }

  async messageOk () {
    const message = (await this._messages.next()).value[0];
    this.assert('ok', [true], 'message received', this.messageOk);
    return message;
  }

  static newTestClient (app, options) {
    app.exceptionFormat = 'txt';
    return new TestClient(options).start(app);
  }

  async patchOk (url, options) {
    return this._requestOk(this.patchOk, 'patch', url, options);
  }

  async postOk (url, options) {
    return this._requestOk(this.postOk, 'post', url, options);
  }

  async putOk (url, options) {
    return this._requestOk(this.putOk, 'put', url, options);
  }

  async sendOk (data) {
    await new Promise(resolve => this.ws.send(data, resolve));
    this.assert('ok', [true], 'send message', this.sendOk);
  }

  async websocketOk (url, options) {
    this.ws = await this.websocket(url, options);

    this.res = null;
    this.ws.on('upgrade', res => (this.res = new ClientResponse(res)));
    this._finished = null;
    this.ws.on('close', (...args) => (this._finished = args));
    this._messages = on(this.ws, 'message');

    await new Promise((resolve, reject) => {
      this.ws.once('open', resolve);
      this.ws.once('error', reject);
    });
    this.assert('ok', [true], `WebSocket handshake with ${url}`, this.websocketOk);
  }

  statusIs (status) {
    this.assert('equal', [this.res.status, status], `response status is ${status}`, this.statusIs);
    return this;
  }

  async _requestOk (skip, method, url, options) {
    this.res = await this[method](url, options);
    this.body = await this.res.buffer();
    this.assert('ok', [true], `${method.toUpperCase()} request for ${url}`, skip);
    return this;
  }

  _waitFinished () {
    if (this._finished) return;
    return new Promise(resolve => this.ws.once('close', resolve));
  }
}
