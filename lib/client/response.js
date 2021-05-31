import Body from '../body.js';

export default class ClientResponse extends Body {
  get isClientError () {
    const statusCode = this.raw.statusCode;
    return statusCode >= 400 && statusCode <= 499;
  }

  get isError () {
    return this.isClientError || this.isServerError;
  }

  get isRedirect () {
    const statusCode = this.raw.statusCode;
    return statusCode >= 300 && statusCode <= 399;
  }

  get isServerError () {
    const statusCode = this.raw.statusCode;
    return statusCode >= 500 && statusCode <= 599;
  }

  get isSuccess () {
    const statusCode = this.raw.statusCode;
    return statusCode >= 200 && statusCode <= 299;
  }

  get status () {
    return this.raw.statusCode;
  }

  get statusMessage () {
    return this.raw.statusMessage;
  }
}
