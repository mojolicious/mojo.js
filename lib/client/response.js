'use strict';

const Body = require('../body');

class ClientResponse extends Body {
  get isClientError () {
    const statusCode = this.status;
    return statusCode >= 400 && statusCode <= 499;
  }

  get isError () {
    return this.isClientError || this.isServerError;
  }

  get isRedirect () {
    const statusCode = this.status;
    return statusCode >= 300 && statusCode <= 399;
  }

  get isServerError () {
    const statusCode = this.status;
    return statusCode >= 500 && statusCode <= 599;
  }

  get isSuccess () {
    const statusCode = this.status;
    return statusCode >= 200 && statusCode <= 299;
  }

  get status () {
    return this.raw.statusCode;
  }

  get statusMessage () {
    return this.raw.statusMessage;
  }
}

module.exports = ClientResponse;
