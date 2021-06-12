import assert from 'assert/strict';
import cheerio from 'cheerio';
import MockClient from './mock.js';
import {on} from 'events';
import StackUtils from 'stack-utils';

/**
 * Class representing an HTTP/WebSocket test client.
 * @extends MockClient
 */
export default class TestClient extends MockClient {
  /**
   * Create HTTP/WebSocket test client.
   * @param {{baseURL?: string, maxRedirects?: number, name?: string, tap?: object}} [options] - Optional settings.
   */
  constructor (options = {}) {
    super(options);

    /** @type {Buffer} - Response body. */
    this.body = undefined;

    /** @type {ClientResponse} - HTTP response. */
    this.res = undefined;

    /** @type {WebSocket} - WebSocket connection. */
    this.ws = undefined;

    this._assert = assert;
    this._dom = undefined;
    this._finished = undefined;
    this._messages = undefined;
    this._stack = new StackUtils();

    if (options.tap !== undefined) this._prepareTap(options.tap);
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

  /**
   * Perform DELETE request.
   * @param {string|URL} url - Request URL.
   * @param {{
     *   agent?: http.Agent,
     *   auth?: string,
     *   body?: string|Buffer|Stream.Readable,
     *   form?: object,
     *   formData?: object,
     *   headers?: object,
     *   json?: object|Array|string|number|true|false|null,
     *   query?: object
     * }} [options] - Optional request config values.
     * @returns {Promise<TestClient>} - Test client itself.
     */
  async deleteOk (url, options) {
    return this._requestOk(this.deleteOk, 'delete', url, options);
  }

  elementExists (selector) {
    const elements = this._cheerio(selector);
    this.assert('ok', [elements.length > 0], `element for selector "${selector}" exists`);
    return this;
  }

  elementExistsNot (selector) {
    const elements = this._cheerio(selector);
    this.assert('ok', [elements.length === 0], `no element for selector "${selector}"`);
    return this;
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

  /**
   * Perform GET request.
   * @param {string|URL} url - Request URL.
   * @param {{
   *   agent?: http.Agent,
   *   auth?: string,
   *   body?: string|Buffer|Stream.Readable,
   *   form?: object,
   *   formData?: object,
   *   headers?: object,
   *   json?: object|Array|string|number|true|false|null,
   *   query?: object
   * }} [options] - Optional request config values.
   * @returns {Promise<TestClient>} - Test client itself.
   */
  async getOk (url, options) {
    return this._requestOk(this.getOk, 'get', url, options);
  }

  /**
   * Perform HEAD request.
   * @param {string|URL} url - Request URL.
   * @param {{
   *   agent?: http.Agent,
   *   auth?: string,
   *   body?: string|Buffer|Stream.Readable,
   *   form?: object,
   *   formData?: object,
   *   headers?: object,
   *   json?: object|Array|string|number|true|false|null,
   *   query?: object
   * }} [options] - Optional request config values.
   * @returns {Promise<TestClient>} - Test client itself.
   */
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

  async messageOk () {
    const message = (await this._messages.next()).value[0];
    this.assert('ok', [true], 'message received', this.messageOk);
    return message;
  }

  static newTestClient (app, options) {
    app.exceptionFormat = 'txt';
    return new TestClient(options).start(app);
  }

  /**
   * Perform OPTIONS request.
   * @param {string|URL} url - Request URL.
   * @param {{
   *   agent?: http.Agent,
   *   auth?: string,
   *   body?: string|Buffer|Stream.Readable,
   *   form?: object,
   *   formData?: object,
   *   headers?: object,
   *   json?: object|Array|string|number|true|false|null,
   *   query?: object
   * }} [options] - Optional request config values.
   * @returns {Promise<TestClient>} - Test client itself.
   */
  async optionsOk (url, options) {
    return this._requestOk(this.optionsOk, 'options', url, options);
  }

  /**
   * Perform PATCH request.
   * @param {string|URL} url - Request URL.
   * @param {{
   *   agent?: http.Agent,
   *   auth?: string,
   *   body?: string|Buffer|Stream.Readable,
   *   form?: object,
   *   formData?: object,
   *   headers?: object,
   *   json?: object|Array|string|number|true|false|null,
   *   query?: object
   * }} [options] - Optional request config values.
   * @returns {Promise<TestClient>} - Test client itself.
   */
  async patchOk (url, options) {
    return this._requestOk(this.patchOk, 'patch', url, options);
  }

  /**
   * Perform POST request.
   * @param {string|URL} url - Request URL.
   * @param {{
   *   agent?: http.Agent,
   *   auth?: string,
   *   body?: string|Buffer|Stream.Readable,
   *   form?: object,
   *   formData?: object,
   *   headers?: object,
   *   json?: object|Array|string|number|true|false|null,
   *   query?: object
   * }} [options] - Optional request config values.
   * @returns {Promise<TestClient>} - Test client itself.
   */
  async postOk (url, options) {
    return this._requestOk(this.postOk, 'post', url, options);
  }

  /**
   * Perform PUT request.
   * @param {string|URL} url - Request URL.
   * @param {{
   *   agent?: http.Agent,
   *   auth?: string,
   *   body?: string|Buffer|Stream.Readable,
   *   form?: object,
   *   formData?: object,
   *   headers?: object,
   *   json?: object|Array|string|number|true|false|null,
   *   query?: object
   * }} [options] - Optional request config values.
   * @returns {Promise<TestClient>} - Test client itself.
   */
  async putOk (url, options) {
    return this._requestOk(this.putOk, 'put', url, options);
  }

  async sendOk (message) {
    await this.ws.send(message);
    this.assert('ok', [true], 'send message', this.sendOk);
  }

  statusIs (status) {
    this.assert('equal', [this.res.status, status], `response status is ${status}`, this.statusIs);
    return this;
  }

  typeIs (value) {
    this.assert('equal', [this.res.get('Content-Type'), value], `Content-Type: ${value}`, this.typeIs);
    return this;
  }

  typeLike (regex) {
    this.assert('match', [this.res.get('Content-Type'), regex], 'Content-Type is similar', this.typeLike);
    return this;
  }

  /**
   * Perform WebSocket handshake.
   * @param {string|URL} url - WebSocket URL.
   * @param {{headers?: object?, protocols?: string[], query?: object}} [options] - Optional request config values.
   * @returns {Promise} - WebSocket object.
   */
  async websocketOk (url, options) {
    const ws = this.ws = await this.websocket(url, options);

    this.res = ws.handshake;
    this._finished = null;
    ws.on('close', (...args) => (this._finished = args));
    this._messages = on(this.ws, 'message');

    this.assert('ok', [true], `WebSocket handshake with ${url}`, this.websocketOk);
  }

  get _cheerio () {
    if (this._dom === undefined) this._dom = cheerio.load(this.body);
    return this._dom;
  }

  _prepareTap (tap) {
    const subtests = [this._assert = tap];
    const assert = this._assert;

    assert.beforeEach(async t => {
      subtests.push(t);
      this._assert = t;
    });

    assert.afterEach(async t => {
      subtests.pop();
      this._assert = subtests[subtests.length - 1];
    });
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
