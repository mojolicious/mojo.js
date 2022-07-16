import type {UserAgentRequestOptions} from '../../types.js';
import type http from 'node:http';
import type {URL} from 'node:url';
import https from 'node:https';
import {HTTPTransport} from './http.js';

/**
 * HTTPS transport class.
 */
export class HTTPSTransport extends HTTPTransport {
  agent = new https.Agent();

  _prepareOptions(config: UserAgentRequestOptions): https.RequestOptions {
    const options: https.RequestOptions = super._prepareOptions(config);
    if (config.ca !== undefined) options.ca = config.ca;
    if (config.insecure !== undefined) options.rejectUnauthorized = config.insecure !== true;
    if (config.servername !== undefined) options.servername = config.servername;
    return options;
  }

  _sendRequest(url: URL, options: https.RequestOptions, cb: (res: http.IncomingMessage) => void): http.ClientRequest {
    return https.request(url, options, cb);
  }
}
