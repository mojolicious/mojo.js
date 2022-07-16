import type {UserAgentWebSocketOptions} from '../../types.js';
import type {Socket} from 'node:net';
import {WebSocket} from '../../websocket.js';
import {UserAgentResponse} from '../response.js';
import WS from 'ws';

/**
 * WebSocket transport class.
 */
export class WSTransport {
  /**
   * Establish WebSocket connection.
   */
  async connect(config: UserAgentWebSocketOptions): Promise<WebSocket> {
    // UNIX domain socket
    if (config.socketPath !== undefined) {
      config.url = new URL(`ws+unix://${config.socketPath}:${new URL(config.url ?? '').pathname}`);
    }

    const ws = new WS(config.url ?? '', config.protocols, {headers: config.headers});
    return await new Promise((resolve, reject) => {
      let handshake: UserAgentResponse;
      let socket: Socket;

      ws.on('upgrade', res => {
        handshake = new UserAgentResponse({
          body: res,
          headers: res.rawHeaders,
          httpVersion: res.httpVersion,
          statusCode: res.statusCode ?? 200,
          statusMessage: res.statusMessage ?? 'OK'
        });
        socket = res.socket;
      });
      ws.on('error', reject);

      ws.on('open', () => {
        // Workaround for a race condition where the first message arrives before the promise resolves
        socket.pause();
        queueMicrotask(() => socket.resume());
        resolve(new WebSocket(ws, handshake, {jsonMode: config.json ?? false}));
      });
    });
  }
}
