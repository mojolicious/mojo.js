import type {UserAgentRequestOptions} from '../../types.js';
import type {URL} from 'url';
import http from 'http';
import Stream from 'stream';
import {UserAgentResponse} from '../response.js';

/**
 * HTTP transport class.
 */
export class HTTPTransport {
  /**
   * HTTP agent.
   */
  agent = new http.Agent();

  /**
   * Destroy active keep-alive connections.
   */
  destroy(): void {
    this.agent.destroy();
  }

  /**
   * Perform HTTP request.
   */
  async request(config: UserAgentRequestOptions): Promise<UserAgentResponse> {
    const options = this._prepareOptions(config);

    return await new Promise((resolve, reject) => {
      const req = this._sendRequest(config.url as URL, options, res => {
        resolve(
          new UserAgentResponse({
            body: res,
            headers: res.rawHeaders,
            httpVersion: res.httpVersion,
            statusCode: res.statusCode ?? 200,
            statusMessage: res.statusMessage ?? 'OK'
          })
        );
      });
      req.once('error', reject);
      req.once('close', reject);

      if (config.body instanceof Buffer) {
        req.end(config.body);
      } else if (config.body instanceof Stream) {
        config.body.pipe(req);
      } else {
        req.end();
      }
    });
  }

  _prepareOptions(config: UserAgentRequestOptions): http.RequestOptions {
    const options: Record<string, any> = {headers: config.headers, method: (config.method ?? '').toUpperCase()};
    if (config.agent !== undefined) options.agent = config.agent;
    if (options.agent === undefined) options.agent = this.agent;
    if (config.auth !== undefined) options.auth = config.auth;
    return options;
  }

  _sendRequest(url: URL, options: http.RequestOptions, cb: (res: http.IncomingMessage) => void): http.ClientRequest {
    return http.request(url, options, cb);
  }
}
