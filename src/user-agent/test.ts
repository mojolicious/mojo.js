import type {UserAgentResponse} from './response.ts';
import type {App} from '../app.ts';
import type {
  JSONValue,
  SSEEvent,
  ServerOptions,
  TestContext,
  TestUserAgentOptions,
  UserAgentRequestOptions,
  UserAgentWebSocketOptions
} from '../types.ts';
import type {WebSocket} from '../websocket.ts';
import type {URL} from 'node:url';
import assert from 'node:assert/strict';
import {on} from 'node:events';
import {MockUserAgent} from './mock.ts';
import DOM from '@mojojs/dom';
import {jsonPointer} from '@mojojs/util';
import * as yaml from 'js-yaml';
import StackUtils from 'stack-utils';

type SkipFunction = (...args: any[]) => any;

// Helper function to add required `TestUserAgent` assert methods
// that are missing in a `TAP` instance. This is as an intended side effect
// to ensure compatibility with `TestUserAgent` class below
function addNodeAssertMethods(tapInstance: TestContext): void {
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

  _assert: typeof assert | TestContext | undefined = undefined;
  _dom: DOM | undefined = undefined;
  _finished: [number, string] | null | undefined = undefined;
  _messages: AsyncIterableIterator<JSONValue> | undefined = undefined;
  _res: UserAgentResponse | undefined = undefined;
  _sse: SSEEvent | undefined = undefined;
  _sseEvents: AsyncIterator<SSEEvent> | undefined = undefined;
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
   * Perform a `GET` request and check for transport errors, but leave the response body for Server-Sent Events. Note
   * that this method is EXPERIMENTAL and might change without warning!
   */
  async getSSEOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._sseOk(this.getSSEOk, 'GET', url, options);
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
   * Perform a `POST` request and check for transport errors, but leave the response body for Server-Sent Events. Note
   * that this method is EXPERIMENTAL and might change without warning!
   */
  async postSSEOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._sseOk(this.postSSEOk, 'POST', url, options);
  }

  /**
   * Perform a `PUT` request and check for transport errors.
   */
  async putOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._requestOk(this.putOk, 'PUT', url, options);
  }

  /**
   * Perform a `QUERY` request and check for transport errors.
   */
  async queryOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._requestOk(this.queryOk, 'QUERY', url, options);
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
   * Current Server-Sent Event. Note that this property is EXPERIMENTAL and might change without warning!
   */
  get sse(): SSEEvent {
    const sse = this._sse;
    if (sse === undefined) throw new Error('No Server-Sent Event received');
    return sse;
  }

  /**
   * Close Server-Sent Events connection. Note that this method is EXPERIMENTAL and might change without warning!
   */
  async sseFinishOk(): Promise<this> {
    await this._sseIterator.return?.();
    this._sseEvents = undefined;
    this.assert('ok', [true], 'closed SSE connection', this.sseFinishOk);
    return this;
  }

  /**
   * Wait for Server-Sent Events connection to be closed by the server. Note that this method is EXPERIMENTAL and might
   * change without warning!
   */
  async sseFinishedOk(): Promise<this> {
    const events = this._sseIterator;
    while ((await events.next()).done !== true);
    this._sseEvents = undefined;
    this.assert('ok', [true], 'SSE connection has been closed', this.sseFinishedOk);
    return this;
  }

  /**
   * Check Server-Sent Event id for exact match. Note that this method is EXPERIMENTAL and might change without warning!
   */
  sseIdIs(id: string | null): this {
    this.assert('strictEqual', [this.sse.id, id], 'exact match for SSE event id', this.sseIdIs);
    return this;
  }

  /**
   * Opposite of `sseIdIs`. Note that this method is EXPERIMENTAL and might change without warning!
   */
  sseIdIsnt(id: string | null): this {
    this.assert('notStrictEqual', [this.sse.id, id], 'no match for SSE event id', this.sseIdIsnt);
    return this;
  }

  /**
   * Wait for next Server-Sent Event to arrive. Note that this method is EXPERIMENTAL and might change without warning!
   */
  async sseOk(): Promise<this> {
    const {done, value} = await this._sseIterator.next();
    if (done !== true) this._sse = value;
    this.assert('ok', [done !== true], 'event received', this.sseOk);
    return this;
  }

  /**
   * Check Server-Sent Event text for exact match. Note that this method is EXPERIMENTAL and might change without
   * warning!
   */
  sseTextIs(text: string): this {
    this.assert('strictEqual', [this.sse.text, text], 'exact match for SSE event text', this.sseTextIs);
    return this;
  }

  /**
   * Opposite of `sseTextIs`. Note that this method is EXPERIMENTAL and might change without warning!
   */
  sseTextIsnt(text: string): this {
    this.assert('notStrictEqual', [this.sse.text, text], 'no match for SSE event text', this.sseTextIsnt);
    return this;
  }

  /**
   * Check Server-Sent Event text for similar match. Note that this method is EXPERIMENTAL and might change without
   * warning!
   */
  sseTextLike(regex: RegExp): this {
    this.assert('match', [this.sse.text, regex], 'similar match for SSE event text', this.sseTextLike);
    return this;
  }

  /**
   * Opposite of `sseTextLike`. Note that this method is EXPERIMENTAL and might change without warning!
   */
  sseTextUnlike(regex: RegExp): this {
    this.assert('doesNotMatch', [this.sse.text, regex], 'no similar match for SSE event text', this.sseTextUnlike);
    return this;
  }

  /**
   * Check Server-Sent Event type for exact match. Note that this method is EXPERIMENTAL and might change without
   * warning!
   */
  sseTypeIs(type: string): this {
    this.assert('strictEqual', [this.sse.type, type], 'exact match for SSE event type', this.sseTypeIs);
    return this;
  }

  /**
   * Opposite of `sseTypeIs`. Note that this method is EXPERIMENTAL and might change without warning!
   */
  sseTypeIsnt(type: string): this {
    this.assert('notStrictEqual', [this.sse.type, type], 'no match for SSE event type', this.sseTypeIsnt);
    return this;
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

  _prepareTap(tap: TestContext): void {
    addNodeAssertMethods(tap);
    this._assert = tap;
    const subtests = [tap];
    const assert = this._assert;

    assert.beforeEach(async (t: TestContext) => {
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

  get _sseIterator(): AsyncIterator<SSEEvent> {
    const events = this._sseEvents;
    if (events === undefined) throw new Error('No active SSE connection');
    return events;
  }

  async _sseOk(
    skip: SkipFunction,
    method: string,
    url: string | URL,
    options?: UserAgentRequestOptions
  ): Promise<this> {
    this._res = await this.request({method, url, ...options});
    this._dom = undefined;
    this._sse = undefined;
    this._sseEvents = this.res.sse();
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
