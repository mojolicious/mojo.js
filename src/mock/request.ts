import type {MockRequestOptions} from '../types.js';
import {IncomingMessage} from 'http';
import {Socket} from 'net';

/**
 * Mock request class.
 */
export class MockRequest extends IncomingMessage {
  constructor(options: MockRequestOptions = {}) {
    super(new Socket());
    this.headers = options.headers ?? {};
    this.method = options.method ?? 'GET';
    this.url = options.url ?? '/';
  }
}
