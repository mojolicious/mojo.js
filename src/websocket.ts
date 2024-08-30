import type {JSONValue, WebSocketBackend} from './types.js';
import type {UserAgentResponse} from './user-agent/response.js';
import EventEmitter, {on} from 'node:events';

interface WebSocketControlEvents {
  close: (this: WebSocket, ...args: any[]) => void;
  ping: (this: WebSocket, ...args: any[]) => void;
  pong: (this: WebSocket, ...args: any[]) => void;
}

interface WebSocketEvents extends WebSocketControlEvents {
  error: (this: WebSocket, error: Error) => void;
  message: (this: WebSocket, message: JSONValue | Buffer) => void;
}

declare interface WebSocketEventEmitter {
  on: <T extends keyof WebSocketEvents>(event: T, listener: WebSocketEvents[T]) => this;
  emit: <T extends keyof WebSocketEvents>(event: T, ...args: Parameters<WebSocketEvents[T]>) => boolean;
}

/**
 * WebSocket connection class.
 */
class WebSocket extends EventEmitter implements WebSocketEventEmitter {
  /**
   * WebSocket handshake.
   */
  handshake: UserAgentResponse | null;
  /**
   * JSON mode.
   */
  jsonMode: boolean;

  _ws: WebSocketBackend;

  constructor(ws: WebSocketBackend, handshake: UserAgentResponse | null, options: {jsonMode: boolean}) {
    super({captureRejections: true});

    this.handshake = handshake;
    this.jsonMode = options.jsonMode ?? false;

    this._ws = ws;

    ws.on('error', error => this.emit('error', error));
    ws.on('message', this._safeMessageHandler.bind(this));

    const safeHandler = this._safeHandler;
    ws.on('close', safeHandler.bind(this, 'close'));
    ws.on('ping', safeHandler.bind(this, 'ping'));
    ws.on('pong', safeHandler.bind(this, 'pong'));
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<JSONValue | Buffer> {
    try {
      for await (const [message] of this._messageIterator()) {
        yield message;
      }
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'AbortError') throw error;
    }
  }

  /**
   * Close WebSocket connection.
   */
  close(code?: number, reason?: string): void {
    this._ws.close(code, reason);
  }

  /**
   * Send WebSocket ping frame.
   */
  async ping(data: Buffer): Promise<void> {
    return await new Promise(resolve => this._ws.ping(data, undefined, () => resolve()));
  }

  /**
   * Send WebSocket message.
   */
  async send(message: any): Promise<void> {
    if (this.jsonMode === false) return await new Promise(resolve => this._ws.send(message, () => resolve()));
    return new Promise(resolve => this._ws.send(JSON.stringify(message), () => resolve()));
  }

  _messageIterator(): AsyncIterableIterator<(JSONValue | Buffer)[]> {
    const ac = new AbortController();

    this._ws.on('close', () => ac.abort());
    return on(this, 'message', {signal: ac.signal});
  }

  _safeHandler<T extends keyof WebSocketControlEvents>(event: T, ...args: Parameters<WebSocketControlEvents[T]>): void {
    try {
      this.emit(event, ...args);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  _safeMessageHandler(message: Buffer, isBinary: boolean): void {
    try {
      if (this.jsonMode === false) {
        this.emit('message', isBinary ? message : message.toString());
      } else {
        this.emit('message', JSON.parse(message.toString()));
      }
    } catch (error) {
      this.emit('error', error as Error);
    }
  }
}

export {WebSocket};
