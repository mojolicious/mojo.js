import {Body} from '../body.js';

/**
 * User agent response class.
 */
export class UserAgentResponse extends Body {
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
   * Response status code.
   */
  get status(): number {
    return this.raw.statusCode as number;
  }

  /**
   * Get response message.
   */
  get statusMessage(): string | undefined {
    return this.raw.statusMessage;
  }

  /**
   * Get `Content-Type` header value.
   */
  get type(): string | undefined {
    return this.headers['content-type'];
  }
}
