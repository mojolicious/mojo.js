import type {MojoWebSocketHandler} from '../types.js';
import type WebSocket from '../websocket.js';
import Context from '../context.js';

export default class WebSocketContext extends Context {
  jsonMode = false;
  _ws: WeakRef<WebSocket> | null = null;

  handleUpgrade (ws: WebSocket): void {
    this._ws = new WeakRef(ws);
    this.emit('connection', ws);
    ws.on('error', error => Context._handleException(this, error));
  }

  get isAccepted (): boolean {
    return this.listenerCount('connection') > 0;
  }

  get isEstablished (): boolean {
    return this._ws !== null;
  }

  get isWebSocket (): boolean {
    return true;
  }

  json (fn: MojoWebSocketHandler): this {
    this.jsonMode = true;
    return this.on('connection', fn as () => void);
  }

  plain (fn: MojoWebSocketHandler): this {
    return this.on('connection', fn as () => void);
  }

  get ws (): WebSocket | null {
    return this._ws?.deref() ?? null;
  }
}
