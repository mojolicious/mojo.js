import type {UserAgentResponse} from './response.js';
import type {App} from '../app.js';
import type {
  JSONValue,
  ServerOptions,
  TestUserAgentOptions,
  UserAgentRequestOptions,
  UserAgentWebSocketOptions
} from '../types.js';
import type {WebSocket} from '../websocket.js';
import type {URL} from 'node:url';
import type {Test} from 'tap';
import assert from 'node:assert/strict';
import {on} from 'node:events';
import {MockUserAgent} from './mock.js';
import DOM from '@mojojs/dom';
import {jsonPointer} from '@mojojs/util';
import yaml from 'js-yaml';
import StackUtils from 'stack-utils';

type SkipFunction = (...args: any[]) => any;

// Helper function to add required `TestUserAgent` assert methods
// that are missing in a `TAP` instance. This is as an intended side effect
// to ensure compatibility with `TestUserAgent` class below
function addNodeAssertMethods(tapInstance: Test): void {
  (tapInstance as any).strictEqual = tapInstance.equal.bind(tapInstance);
  (tapInstance as any).notStrictEqual = tapInstance.not.bind(tapInstance);
  (tapInstance as any).doesNotMatch = tapInstance.notMatch.bind(tapInstance);
  (tapInstance as any).deepStrictEqual = tapInstance.same.bind(tapInstance);
}

/**
 * Test user-agent class.
 */
export class TestUserAgent extends MockUserAgent {
  /**
   * Current HTTP response content.
   */
  body: Buffer = Buffer.from('');

  _assert: typeof assert | Test | undefined = undefined;
  _dom: DOM | undefined = undefined;
  _finished: [number, string] | null | undefined = undefined;
  _messages: AsyncIterableIterator<JSONValue> | undefined = undefined;
  _res: UserAgentResponse | undefined = undefined;
  _stack: StackUtils = new StackUtils();
  _ws: WebSocket | undefined = undefined;

  constructor(options: TestUserAgentOptions = {}) {
    super(options);
    if (options.tap !== undefined) this._prepareTap(options.tap);
  }

  /**
   * Delegate assertion to test framework currently in use.
   */
  assert(name: string, args: any[], msg: string, skip: SkipFunction): void {
    const test: any = this._assert ?? assert;
    test[name](...args, msg, {stack: this._stack.captureString(10, skip).replaceAll('file://', '')});
  }

  /**
   * Check response content for exact match.
   */
  bodyIs(body: string): this {
    this.assert('strictEqual', [this.body.toString(), body], 'body is equal', this.bodyIs);
    return this;
  }

  /**
   * Opposite of `bodyIs`.
   */
  bodyIsnt(body: string): this {
    this.assert('notStrictEqual', [this.body.toString(), body], 'body is not equal', this.bodyIsnt);
    return this;
  }

  /**
   * Check response content for similar match.
   */
  bodyLike(regex: RegExp): this {
    this.assert('match', [this.body.toString(), regex], 'body is similar', this.bodyLike);
    return this;
  }

  /**
   * Opposite of `bodyLike`.
   */
  bodyUnlike(regex: RegExp): this {
    this.assert('doesNotMatch', [this.body.toString(), regex], 'body is not similar', this.bodyUnlike);
    return this;
  }

  /**
   * Close WebSocket connection gracefully.
   */
  async closeOk(code: number, reason: string): Promise<void> {
    this.ws.close(code, reason);
    await this._waitFinished();
    this.assert('ok', [true], 'closed WebSocket', this.closeOk);
  }

  /**
   * Wait for WebSocket connection to be closed gracefully and check status.
   */
  async closedOk(code: number): Promise<void> {
    await this._waitFinished();
    const finished = this._finished == null ? null : this._finished[0];
    this.assert('strictEqual', [finished, code], `WebSocket closed with status ${code}`, this.closedOk);
  }

  /**
   * Perform a `DELETE` request and check for transport errors.
   */
  async deleteOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._requestOk(this.deleteOk, 'DELETE', url, options);
  }

  /**
   * Checks for existence of the CSS selectors first matching HTML/XML element.
   */
  elementExists(selector: string): this {
    const elements = this._html.find(selector);
    this.assert('ok', [elements.length > 0], `element for selector "${selector}" exists`, this.elementExists);
    return this;
  }

  /**
   * Opposite of `elementExists`.
   */
  elementExistsNot(selector: string): this {
    const elements = this._html.find(selector);
    this.assert('ok', [elements.length === 0], `no element for selector "${selector}"`, this.elementExistsNot);
    return this;
  }

  /**
   * Perform a `GET` request and check for transport errors.
   */
  async getOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._requestOk(this.getOk, 'GET', url, options);
  }

  /**
   * Perform a `HEAD` request and check for transport errors.
   */
  async headOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._requestOk(this.headOk, 'HEAD', url, options);
  }

  /**
   * Check if response header exists.
   */
  headerExists(name: string): this {
    this.assert('ok', [this.res.get(name) !== null], `header "${name}" exists`, this.headerExists);
    return this;
  }

  /**
   * Opposite of `headerExists`.
   */
  headerExistsNot(name: string): this {
    this.assert('ok', [this.res.get(name) === null], `no "${name}" header`, this.headerExistsNot);
    return this;
  }

  /**
   * Check response header for exact match.
   */
  headerIs(name: string, value: string): this {
    this.assert('strictEqual', [this.res.get(name), value], `${name}: ${value}`, this.headerIs);
    return this;
  }

  /**
   * Opposite of `headerIs`.
   */
  headerIsnt(name: string, value: string): this {
    this.assert('notStrictEqual', [this.res.get(name), value], `not ${name}: ${value}`, this.headerIsnt);
    return this;
  }

  /**
   * Check response header for similar match.
   */
  headerLike(name: string, regex: RegExp): this {
    this.assert('match', [this.res.get(name), regex], `${name} is similar`, this.headerLike);
    return this;
  }

  /**
   * Check if JSON response contains a value that can be identified using the given JSON Pointer.
   */
  jsonHas(pointer: string): this {
    const has = jsonPointer(JSON.parse(this.body.toString()), pointer) !== undefined;
    this.assert('ok', [has], `has value for JSON Pointer "${pointer}" (JSON)`, this.jsonHas);
    return this;
  }

  /**
   * Check the value extracted from JSON response using the given JSON Pointerr, which defaults to the root value if it
   * is omitted.
   */
  jsonIs(value: JSONValue, pointer = ''): this {
    const expected = jsonPointer(JSON.parse(this.body.toString()), pointer);
    this.assert('deepStrictEqual', [expected, value], `exact match for JSON Pointer "${pointer}" (JSON)`, this.jsonIs);
    return this;
  }

  /**
   * Wait for next WebSocket message to arrive.
   */
  async messageOk(): Promise<JSONValue> {
    if (this._messages === undefined) throw new Error('No active WebSocket connection');
    const message = (await this._messages.next()).value[0];
    this.assert('ok', [true], 'message received', this.messageOk);
    return message;
  }

  /**
   * Create a new test user-agent.
   */
  static async newTestUserAgent(
    app: App,
    options?: TestUserAgentOptions,
    serverOptions?: ServerOptions
  ): Promise<TestUserAgent> {
    app.exceptionFormat = 'txt';
    return await new TestUserAgent(options).start(app, serverOptions);
  }

  /**
   * Perform a `OPTIONS` request and check for transport errors.
   */
  async optionsOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._requestOk(this.optionsOk, 'OPTIONS', url, options);
  }

  /**
   * Perform a `PATCH` request and check for transport errors.
   */
  async patchOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._requestOk(this.patchOk, 'PATCH', url, options);
  }

  /**
   * Perform a `POST` request and check for transport errors.
   */
  async postOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._requestOk(this.postOk, 'POST', url, options);
  }

  /**
   * Perform a `PUT` request and check for transport errors.
   */
  async putOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._requestOk(this.putOk, 'PUT', url, options);
  }

  /**
   * Current HTTP response.
   */
  get res(): UserAgentResponse {
    const res = this._res;
    if (res === undefined) throw new Error('No active HTTP response');
    return res;
  }

  /**
   * Send message or frame via WebSocket.
   */
  async sendOk(message: any): Promise<void> {
    await this.ws.send(message);
    this.assert('ok', [true], 'send message', this.sendOk);
  }

  /**
   * Check response status for exact match.
   */
  statusIs(status: number): this {
    this.assert('strictEqual', [this.res.statusCode, status], `response status is ${status}`, this.statusIs);
    return this;
  }

  /**
   * Checks text content of the CSS selectors first matching HTML/XML element for similar match.
   */
  textLike(selector: string, regex: RegExp): this {
    this.assert(
      'match',
      [this._html.at(selector)?.text() ?? '', regex],
      `similar match for selector "${selector}"`,
      this.textLike
    );
    return this;
  }

  /**
   * Checks text content of the CSS selectors first matching HTML/XML element for no match.
   */
  textUnlike(selector: string, regex: RegExp): this {
    this.assert(
      'doesNotMatch',
      [this._html.at(selector)?.text() ?? '', regex],
      `no similar match for selector "${selector}"`,
      this.textLike
    );
    return this;
  }

  /**
   * Check response `Content-Type` header for exact match.
   */
  typeIs(value: string): this {
    this.assert('strictEqual', [this.res.type, value], `Content-Type: ${value}`, this.typeIs);
    return this;
  }

  /**
   * Check response `Content-Type` header for similar match.
   */
  typeLike(regex: RegExp): this {
    this.assert('match', [this.res.type, regex], 'Content-Type is similar', this.typeLike);
    return this;
  }

  /**
   * Open a WebSocket connection with transparent handshake.
   */
  async websocketOk(url: string | URL, options?: UserAgentWebSocketOptions): Promise<void> {
    const ws = (this._ws = await this.websocket(url, options));

    this._res = ws.handshake ?? undefined;
    this._finished = null;
    ws.on('close', (...args: [number, string]) => (this._finished = args));
    this._messages = on(this.ws, 'message');

    this.assert('ok', [true], `WebSocket handshake with ${url.toString()}`, this.websocketOk);
  }

  /**
   * Active WebSocket connection.
   */
  get ws(): WebSocket {
    const ws = this._ws;
    if (ws === undefined) throw new Error('No active WebSocket connection');
    return ws;
  }

  /**
   * Check if YAML response contains a value that can be identified using the given JSON Pointer.
   */
  yamlHas(pointer: string): this {
    const has = jsonPointer(yaml.load(this.body.toString()) as JSONValue, pointer) !== undefined;
    this.assert('ok', [has], `has value for JSON Pointer "${pointer}" (YAML)`, this.jsonHas);
    return this;
  }

  /**
   * Check the value extracted from YAML response using the given JSON Pointerr, which defaults to the root value if it
   * is omitted.
   */
  yamlIs(value: JSONValue, pointer = ''): this {
    const expected = jsonPointer(yaml.load(this.body.toString()) as JSONValue, pointer);
    this.assert('deepStrictEqual', [expected, value], `exact match for JSON Pointer "${pointer}" (YAML)`, this.yamlIs);
    return this;
  }

  get _html(): DOM {
    if (this._dom === undefined) this._dom = new DOM(this.body.toString());
    return this._dom;
  }

  _prepareTap(tap: Test): void {
    addNodeAssertMethods(tap);
    this._assert = tap;
    const subtests = [tap];
    const assert = this._assert;

    assert.beforeEach(async t => {
      addNodeAssertMethods(t);
      subtests.push(t);
      this._assert = t;
    });

    assert.afterEach(async () => {
      subtests.pop();
      this._assert = subtests[subtests.length - 1];
    });
  }

  async _requestOk(
    skip: SkipFunction,
    method: string,
    url: string | URL,
    options?: UserAgentRequestOptions
  ): Promise<this> {
    this._res = await this.request({method, url, ...options});
    this._dom = undefined;
    this.body = await this.res.buffer();
    this.assert('ok', [true], `${method.toUpperCase()} request for ${url.toString()}`, skip);
    return this;
  }

  async _waitFinished(): Promise<void> {
    if (this._finished != null) return;
    return await new Promise(resolve => {
      this.ws.once('close', () => {
        resolve();
      });
    });
  }
}
