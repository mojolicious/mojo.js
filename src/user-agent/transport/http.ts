import type {UserAgentRequestOptions} from '../../types.js';
import type {Socket} from 'node:net';
import type {URL} from 'node:url';
import http from 'node:http';
import Stream from 'node:stream';
import {UserAgentResponse} from '../response.js';
import {termEscape} from '@mojojs/util';

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
  async destroy(): Promise<void> {
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

      if (process.env.MOJO_CLIENT_DEBUG === '1') {
        req.on('socket', (socket: Socket) => {
          const stderr = process.stderr;
          socket.on('data', (chunk: string) => stderr.write(termEscape(`-- Client <<< Server\n${chunk}`)));
          const write = socket.write;
          socket.write = (chunk: string | Uint8Array, cb: any) => {
            stderr.write(termEscape(`-- Client >>> Server\n${chunk}`));
            return write.apply(socket, [chunk, cb]);
          };
        });
      }

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
    if (config.signal !== undefined) options.signal = config.signal;
    if (config.socketPath !== undefined) options.socketPath = config.socketPath;
    return options;
  }

  _sendRequest(url: URL, options: http.RequestOptions, cb: (res: http.IncomingMessage) => void): http.ClientRequest {
    return http.request(url, options, cb);
  }
}
