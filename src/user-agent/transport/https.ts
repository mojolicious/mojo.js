import type {UserAgentRequestOptions} from '../../types.js';
import type http from 'http';
import https from 'https';
import {HTTPTransport} from './http.js';

export class HTTPSTransport extends HTTPTransport {
  agent = new https.Agent();

  prepareOptions(config: UserAgentRequestOptions): Record<string, any> {
    const options = super.prepareOptions(config);
    if (config.ca !== undefined) options.ca = config.ca;
    if (config.insecure !== undefined) options.rejectUnauthorized = config.insecure !== true;
    if (config.servername !== undefined) options.servername = config.servername;
    return options;
  }

  sendRequest(url: any, options: https.RequestOptions, cb: (res: http.IncomingMessage) => void): http.ClientRequest {
    return https.request(url, options, cb);
  }
}
