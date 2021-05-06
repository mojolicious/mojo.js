import Body from '../body.js';

export default class ClientResponse extends Body {
  get isClientError () {
    return this.raw.statusCode >= 400 && this.raw.statusCode <= 499;
  }

  get isError () {
    return this.isClientError || this.isServerError;
  }

  get isRedirect () {
    return this.raw.statusCode >= 300 && this.raw.statusCode <= 399;
  }

  get isServerError () {
    return this.raw.statusCode >= 500 && this.raw.statusCode <= 599;
  }

  get isSuccess () {
    return this.raw.statusCode >= 200 && this.raw.statusCode <= 299;
  }

  get status () {
    return this.raw.statusCode;
  }

  get statusMessage () {
    return this.raw.statusMessage;
  }
}
