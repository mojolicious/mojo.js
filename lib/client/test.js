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

  /**
   * Method used to perform tests with `assert` or `tap`.
   * @param {string} name - Name of test function.
   * @param {Array} args - Arguments to pass to test function.
   * @param {string} msg - Test description.
   * @param {Function} skip - Function to skip when creating a stack trace.
   * @example
   *   function bodyIs (body) {
   *     client.assert('equal', [client.body.toString(), body], 'body is equal', bodyIs);
   *   }
   */
  assert (name, args, msg, skip) {
    this._assert[name](...args, msg, {stack: this._stack.captureString(10, skip)});
  }

  /**
   * Check response body for exact match.
   * @param {string} body - Expected response body.
   * @returns {TestClient} - Test client itself.
   */
  bodyIs (body) {
    this.assert('equal', [this.body.toString(), body], 'body is equal', this.bodyIs);
    return this;
  }

  /**
   * Check if response body matches a regular expression.
   * @param {RegExp} regex - Regular expression to match against response body.
   * @returns {TestClient} - Test client itself.
   */
  bodyLike (regex) {
    this.assert('match', [this.body.toString(), regex], 'body is similar', this.bodyLike);
    return this;
  }

  /**
   * Check if response body does not match a regular expression.
   * @param {RegExp} regex - Regular expression to match against response body.
   * @returns {TestClient} - Test client itself.
   */
  bodyUnlike (regex) {
    this.assert('notMatch', [this.body.toString(), regex], 'body is not similar', this.bodyLike);
    return this;
  }

  /**
   * Close WebSocket connection.
   * @param {number} [code] - WebSocket close code.
   * @param {string} [reason] - WebSocket close reason.
   */
  async closeOk (code, reason) {
    this.ws.close(code, reason);
    await this._waitFinished();
    this.assert('ok', [true], 'closed WebSocket', this.closeOk);
  }

  /**
   * Wait for WebSocket connection to be closed.
   * @param {number} [code] - WebSocket close code.
   */
  async closedOk (code) {
    await this._waitFinished();
    this.assert('equal', [this._finished[0], code], `WebSocket closed with status ${code}`, this.closedOk);
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

  /**
   * Check if HTML response body contains an element matching the CSS selector.
   * @param {string} selector - CSS selector.
   * @returns {TestClient} - Test client itself.
   */
  elementExists (selector) {
    const elements = this._cheerio(selector);
    this.assert('ok', [elements.length > 0], `element for selector "${selector}" exists`);
    return this;
  }

  /**
   * Check if HTML response body does not contain an element matching the CSS selector.
   * @param {string} selector - CSS selector.
   * @returns {TestClient} - Test client itself.
   */
  elementExistsNot (selector) {
    const elements = this._cheerio(selector);
    this.assert('ok', [elements.length === 0], `no element for selector "${selector}"`);
    return this;
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

  /**
   * Check if response contains a header with this name.
   * @param {string} name - Header name.
   * @returns {TestClient} - Test client itself.
   */
  headerExists (name) {
    this.assert('ok', [this.res.get(name) !== undefined], `header "${name}" exists`, this.headerExists);
    return this;
  }

  /**
   * Check if response does not contain a header with this name.
   * @param {string} name - Header name.
   * @returns {TestClient} - Test client itself.
   */
  headerExistsNot (name) {
    this.assert('notOk', [this.res.get(name) !== undefined], `no "${name}" header`, this.headerExistsNot);
    return this;
  }

  /**
   * Check response header for an exact match.
   * @param {string} name - Header name.
   * @param {string} value - Header value.
   * @returns {TestClient} - Test client itself.
   */
  headerIs (name, value) {
    this.assert('equal', [this.res.get(name), value], `${name}: ${value}`, this.headerIs);
    return this;
  }

  /**
   * Check if response header matches a regular expression.
   * @param {string} name - Header name.
   * @param {RegExp} regex - Header value regular expression.
   * @returns {TestClient} - Test client itself.
   */
  headerLike (name, regex) {
    this.assert('match', [this.res.get(name), regex], `${name} is similar`, this.headerLike);
    return this;
  }

  /**
   * Check if JSON response matches the data structure.
   * @param {object|Array|string|number|true|false|null} value - Data structure to compare JSON response to.
   * @returns {TestClient} - Test client itself.
   */
  jsonIs (value) {
    this.assert('same', [JSON.parse(this.body.toString()), value], 'JSON body is equal', this.jsonIs);
    return this;
  }

  /**
   * Wait for next WebSocket message.
   * @returns {Buffer|object|Array|string|number|true|false|null} - Next WebSocket message.
   */
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

  /**
   * Send WebSocket message.
   * @param {Buffer|object|Array|string|number|true|false|null} message - WebSocket message to send.
   */
  async sendOk (message) {
    await this.ws.send(message);
    this.assert('ok', [true], 'send message', this.sendOk);
  }

  /**
   * Check response status code.
   * @param {number} status - Expected response status code.
   * @returns {TestClient} - Test client itself.
   */
  statusIs (status) {
    this.assert('equal', [this.res.status, status], `response status is ${status}`, this.statusIs);
    return this;
  }

  /**
   * Check "Content-Type" response header for an exact match.
   * @param {string} value - Header value.
   * @returns {TestClient} - Test client itself.
   */
  typeIs (value) {
    this.assert('equal', [this.res.get('Content-Type'), value], `Content-Type: ${value}`, this.typeIs);
    return this;
  }

  /**
   * Check if "Content-Type" response header matches a regular expression.
   * @param {RegExp} regex - Header value regular expression.
   * @returns {TestClient} - Test client itself.
   */
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
