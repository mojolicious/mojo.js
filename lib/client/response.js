import Body from '../body.js';

/**
 * Class representing an HTTP/WebSocket client response.
 * @extends Body
 */
export default class ClientResponse extends Body {
  /** @returns {boolean} - Check if response has a 4xx status code. */
  get isClientError () {
    const statusCode = this.status;
    return statusCode >= 400 && statusCode <= 499;
  }

  /** @returns {boolean} - Check if response has a 4xx or 5xx status code. */
  get isError () {
    return this.isClientError || this.isServerError;
  }

  /** @returns {boolean} - Check if response has a 3xx status code. */
  get isRedirect () {
    const statusCode = this.status;
    return statusCode >= 300 && statusCode <= 399;
  }

  /** @returns {boolean} - Check if response has a 5xx status code. */
  get isServerError () {
    const statusCode = this.status;
    return statusCode >= 500 && statusCode <= 599;
  }

  /** @returns {boolean} - Check if response has a 2xx status code. */
  get isSuccess () {
    const statusCode = this.status;
    return statusCode >= 200 && statusCode <= 299;
  }

  /** @returns {number} - Response status code. */
  get status () {
    return this.raw.statusCode;
  }

  /** @returns {string} - Response status message. */
  get statusMessage () {
    return this.raw.statusMessage;
  }
}
