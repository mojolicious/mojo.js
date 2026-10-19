import type {SSEEvent} from '../types.ts';
import type {Readable} from 'node:stream';
import {Body} from '../body.ts';
import {parseEvent} from '../sse.ts';

interface UserAgentResponseOptions {
  body: Readable;
  headers: string[];
  httpVersion: string;
  statusCode: number;
  statusMessage: string;
}

/**
 * User-agent response class.
 */
export class UserAgentResponse extends Body {
  /**
   * HTTP version.
   */
  httpVersion: string;
  /**
   * Response status code.
   */
  statusCode: number;
  /**
   * Response status message.
   */
  statusMessage: string;

  constructor(options: UserAgentResponseOptions) {
    super(options.headers, options.body);
    this.httpVersion = options.httpVersion;
    this.statusCode = options.statusCode;
    this.statusMessage = options.statusMessage;
  }

  /**
   * Check if response has a `4xx` response status code.
   */
  get isClientError(): boolean {
    const {statusCode} = this;
    return statusCode >= 400 && statusCode <= 499;
  }

  /**
   * Check if response has a `4xx` or `5xx` response status code.
   */
  get isError(): boolean {
    return this.isClientError || this.isServerError;
  }

  /**
   * Check if response has a `3xx` response status code.
   */
  get isRedirect(): boolean {
    const {statusCode} = this;
    return statusCode >= 300 && statusCode <= 399;
  }

  /**
   * Check if response has a `5xx` response status code.
   */
  get isServerError(): boolean {
    const {statusCode} = this;
    return statusCode >= 500 && statusCode <= 599;
  }

  /**
   * Check if response has a `2xx` response status code.
   */
  get isSuccess(): boolean {
    const {statusCode} = this;
    return statusCode >= 200 && statusCode <= 299;
  }

  /**
   * Get async iterator for Server-Sent Events from response body. Note that this method is EXPERIMENTAL and might
   * change without warning!
   * @example
   * // Iterate over events
   * for await (const {id, type, text} of res.sse()) {
   *   console.log(`${type}: ${text}`);
   * }
   */
  async *sse(): AsyncIterableIterator<SSEEvent> {
    const decoder = new TextDecoder();
    let buffer = '';
    for await (const chunk of this.createReadStream()) {
      buffer += decoder.decode(chunk, {stream: true});
      let [event, rest] = parseEvent(buffer);
      while (event !== null) {
        yield event;
        [event, rest] = parseEvent(rest);
      }
      buffer = rest;
    }
  }

  /**
   * Get `Content-Type` header value.
   */
  get type(): string | null {
    return this.get('Content-Type');
  }
}
