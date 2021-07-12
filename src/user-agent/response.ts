import {Body} from '../body.js';

export class UserAgentResponse extends Body {
  get isClientError(): boolean {
    const statusCode = this.status;
    return statusCode >= 400 && statusCode <= 499;
  }

  get isError(): boolean {
    return this.isClientError || this.isServerError;
  }

  get isRedirect(): boolean {
    const statusCode = this.status;
    return statusCode >= 300 && statusCode <= 399;
  }

  get isServerError(): boolean {
    const statusCode = this.status;
    return statusCode >= 500 && statusCode <= 599;
  }

  get isSuccess(): boolean {
    const statusCode = this.status;
    return statusCode >= 200 && statusCode <= 299;
  }

  get status(): number {
    return this.raw.statusCode as number;
  }

  get statusMessage(): string | undefined {
    return this.raw.statusMessage;
  }

  get type(): string | undefined {
    return this.headers['content-type'];
  }
}
