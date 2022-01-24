import type {UserAgentWebSocketOptions} from '../../types.js';
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
    const ws = new WS(config.url ?? '', config.protocols, {headers: config.headers});
    return await new Promise((resolve, reject) => {
      let handshake: UserAgentResponse;
      ws.on('upgrade', res => (handshake = new UserAgentResponse(res)));
      ws.on('error', reject);

      ws.on('open', () => {
        // Workaround for a race condition where the first message arrives before the promise resolves
        const socket = handshake.raw.socket;
        socket.pause();
        queueMicrotask(() => socket.resume());
        resolve(new WebSocket(ws, handshake, {jsonMode: config.json ?? false}));
      });
    });
  }
}
