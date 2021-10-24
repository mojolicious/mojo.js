import type {App} from '../app.js';
import type {JSONValue, TestUserAgentOptions, UserAgentRequestOptions, UserAgentWebSocketOptions} from '../types.js';
import type {WebSocket} from '../websocket.js';
import type {UserAgentResponse} from './response.js';
import type {URL} from 'url';
import assert from 'assert/strict';
import {on} from 'events';
import {jsonPointer} from '../util.js';
import {MockUserAgent} from './mock.js';
import cheerio from 'cheerio';
import yaml from 'js-yaml';
import StackUtils from 'stack-utils';

type SkipFunction = (...args: any[]) => any;

export class TestUserAgent extends MockUserAgent {
  body: Buffer = Buffer.from('');
  _assert: typeof assert | Tap.Tap | undefined = undefined;
  _dom: cheerio.Root | undefined = undefined;
  _finished: [number, string] | null | undefined = undefined;
  _messages: AsyncIterableIterator<JSONValue> | undefined = undefined;
  _res: UserAgentResponse | undefined = undefined;
  _stack: StackUtils = new StackUtils();
  _ws: WebSocket | undefined = undefined;

  constructor(options: TestUserAgentOptions = {}) {
    super(options);
    if (options.tap !== undefined) this._prepareTap(options.tap);
  }

  assert(name: string, args: any[], msg: string, skip: SkipFunction): void {
    const test: any = this._assert ?? assert;
    test[name](...args, msg, {stack: this._stack.captureString(10, skip)});
  }

  bodyIs(body: string): this {
    this.assert('equal', [this.body.toString(), body], 'body is equal', this.bodyIs);
    return this;
  }

  bodyLike(regex: RegExp): this {
    this.assert('match', [this.body.toString(), regex], 'body is similar', this.bodyLike);
    return this;
  }

  bodyUnlike(regex: RegExp): this {
    this.assert('notMatch', [this.body.toString(), regex], 'body is not similar', this.bodyLike);
    return this;
  }

  async closeOk(code: number, reason: string): Promise<void> {
    this.ws.close(code, reason);
    await this._waitFinished();
    this.assert('ok', [true], 'closed WebSocket', this.closeOk);
  }

  async closedOk(code: number): Promise<void> {
    await this._waitFinished();
    const finished = this._finished == null ? null : this._finished[0];
    this.assert('equal', [finished, code], `WebSocket closed with status ${code}`, this.closedOk);
  }

  async deleteOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._requestOk(this.deleteOk, 'delete', url, options);
  }

  elementExists(selector: string): this {
    const elements = this._cheerio(selector);
    this.assert('ok', [elements.length > 0], `element for selector "${selector}" exists`, this.elementExists);
    return this;
  }

  elementExistsNot(selector: string): this {
    const elements = this._cheerio(selector);
    this.assert('ok', [elements.length === 0], `no element for selector "${selector}"`, this.elementExistsNot);
    return this;
  }

  async getOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._requestOk(this.getOk, 'get', url, options);
  }

  async headOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._requestOk(this.headOk, 'head', url, options);
  }

  headerExists(name: string): this {
    this.assert('ok', [this.res.get(name) !== undefined], `header "${name}" exists`, this.headerExists);
    return this;
  }

  headerExistsNot(name: string): this {
    this.assert('notOk', [this.res.get(name) !== undefined], `no "${name}" header`, this.headerExistsNot);
    return this;
  }

  headerIs(name: string, value: string): this {
    this.assert('equal', [this.res.get(name), value], `${name}: ${value}`, this.headerIs);
    return this;
  }

  headerLike(name: string, regex: RegExp): this {
    this.assert('match', [this.res.get(name), regex], `${name} is similar`, this.headerLike);
    return this;
  }

  jsonIs(value: JSONValue, pointer = ''): this {
    const expected = jsonPointer(JSON.parse(this.body.toString()), pointer);
    this.assert('same', [expected, value], `exact match for JSON Pointer "${pointer}" (JSON)`, this.jsonIs);
    return this;
  }

  jsonHas(pointer: string): this {
    const has = jsonPointer(JSON.parse(this.body.toString()), pointer) !== undefined;
    this.assert('ok', [has], `has value for JSON Pointer "${pointer}" (JSON)`, this.jsonHas);
    return this;
  }

  async messageOk(): Promise<JSONValue> {
    if (this._messages === undefined) throw new Error('No actitve WebSocket connection');
    const message = (await this._messages.next()).value[0];
    this.assert('ok', [true], 'message received', this.messageOk);
    return message;
  }

  static async newTestUserAgent(app: App, options?: TestUserAgentOptions): Promise<TestUserAgent> {
    app.exceptionFormat = 'txt';
    return await new TestUserAgent(options).start(app);
  }

  async optionsOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._requestOk(this.optionsOk, 'options', url, options);
  }

  async patchOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._requestOk(this.patchOk, 'patch', url, options);
  }

  async postOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._requestOk(this.postOk, 'post', url, options);
  }

  async putOk(url: string | URL, options?: UserAgentRequestOptions): Promise<this> {
    return await this._requestOk(this.putOk, 'put', url, options);
  }

  get res(): UserAgentResponse {
    const res = this._res;
    if (res === undefined) throw new Error('No active HTTP response');
    return res;
  }

  async sendOk(message: JSONValue | Buffer): Promise<void> {
    await this.ws.send(message);
    this.assert('ok', [true], 'send message', this.sendOk);
  }

  statusIs(status: number): this {
    this.assert('equal', [this.res.status, status], `response status is ${status}`, this.statusIs);
    return this;
  }

  typeIs(value: string): this {
    this.assert('equal', [this.res.type, value], `Content-Type: ${value}`, this.typeIs);
    return this;
  }

  typeLike(regex: RegExp): this {
    this.assert('match', [this.res.type, regex], 'Content-Type is similar', this.typeLike);
    return this;
  }

  async websocketOk(url: string | URL, options?: UserAgentWebSocketOptions): Promise<void> {
    const ws = (this._ws = await this.websocket(url, options));

    this._res = ws.handshake ?? undefined;
    this._finished = null;
    ws.on('close', (...args: [number, string]) => (this._finished = args));
    this._messages = on(this.ws, 'message');

    this.assert('ok', [true], `WebSocket handshake with ${url.toString()}`, this.websocketOk);
  }

  get ws(): WebSocket {
    const ws = this._ws;
    if (ws === undefined) throw new Error('No active WebSocket connection');
    return ws;
  }

  yamlIs(value: JSONValue, pointer = ''): this {
    const expected = jsonPointer(yaml.load(this.body.toString()) as JSONValue, pointer);
    this.assert('same', [expected, value], `exact match for JSON Pointer "${pointer}" (YAML)`, this.yamlIs);
    return this;
  }

  yamlHas(pointer: string): this {
    const has = jsonPointer(yaml.load(this.body.toString()) as JSONValue, pointer) !== undefined;
    this.assert('ok', [has], `has value for JSON Pointer "${pointer}" (YAML)`, this.jsonHas);
    return this;
  }

  get _cheerio(): cheerio.Root {
    if (this._dom === undefined) this._dom = cheerio.load(this.body ?? '');
    return this._dom;
  }

  _prepareTap(tap: Tap.Tap): void {
    const subtests = [(this._assert = tap)];
    const assert = this._assert;

    assert.beforeEach(async t => {
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
