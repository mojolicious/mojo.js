import http from 'http';
import Stream from 'stream';
import {UserAgentResponse} from '../response.js';

export class HTTPTransport {
  prepareOptions(config: Record<string, any>): Record<string, any> {
    const options: Record<string, any> = {headers: config.headers, method: config.method.toUpperCase()};
    if (config.agent !== undefined) options.agent = config.agent;
    if (config.auth !== undefined) options.auth = config.auth;
    return options;
  }

  async request(config: Record<string, any>): Promise<UserAgentResponse> {
    const options = this.prepareOptions(config);

    return await new Promise((resolve, reject) => {
      const req = this.sendRequest(config.url, options, res => resolve(new UserAgentResponse(res)));
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

  sendRequest(url: any, options: any, cb: (res: http.IncomingMessage) => void): http.ClientRequest {
    return http.request(url, options, cb);
  }
}
