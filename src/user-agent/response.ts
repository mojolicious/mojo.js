import type {IncomingMessage} from 'http';
import {Body} from '../body.js';

interface UserAgentResponseOptions {
  headers: string[];
  httpVersion: string;
  status: number;
  statusMessage: string;
}

/**
 * User agent response class.
 */
export class UserAgentResponse extends Body {
  /**
   * HTTP version.
   */
  httpVersion: string;
  /**
   * Response status code.
   */
  status: number;
  /**
   * Response message.
   */
  statusMessage: string;

  constructor(stream: IncomingMessage, options: UserAgentResponseOptions) {
    super(options.headers, stream);
    this.httpVersion = options.httpVersion;
    this.status = options.status;
    this.statusMessage = options.statusMessage;
  }

  /**
   * Check if response has a `4xx` response status code.
   */
  get isClientError(): boolean {
    const statusCode = this.status;
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
    const statusCode = this.status;
    return statusCode >= 300 && statusCode <= 399;
  }

  /**
   * Check if response has a `5xx` response status code.
   */
  get isServerError(): boolean {
    const statusCode = this.status;
    return statusCode >= 500 && statusCode <= 599;
  }

  /**
   * Check if response has a `2xx` response status code.
   */
  get isSuccess(): boolean {
    const statusCode = this.status;
    return statusCode >= 200 && statusCode <= 299;
  }

  /**
   * Get `Content-Type` header value.
   */
  get type(): string | null {
    return this.get('Content-Type');
  }
}
