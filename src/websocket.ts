import type {JSONValue} from './types.js';
import type {UserAgentResponse} from './user-agent/response.js';
import type WS from 'ws';
import EventEmitter, {on} from 'events';

interface WebSocketControlEvents {
  close: (...args: any[]) => void,
  ping: (...args: any[]) => void,
  pong: (...args: any[]) => void
}

interface WebSocketEvents extends WebSocketControlEvents {
  error: (this: WebSocket, error: Error) => void,
  message: (this: WebSocket, message: JSONValue | Buffer) => void
}

declare interface WebSocket {
  on: <T extends keyof WebSocketEvents>(event: T, listener: WebSocketEvents[T]) => this,
  emit: <T extends keyof WebSocketEvents>(event: T, ...args: Parameters<WebSocketEvents[T]>) => boolean
}

class WebSocket extends EventEmitter {
  handshake: UserAgentResponse | null;
  jsonMode: boolean;
  _raw: WS;

  constructor (ws: WS, handshake: UserAgentResponse | null, options: {jsonMode: boolean}) {
    super({captureRejections: true});

    this.handshake = handshake;
    this.jsonMode = options.jsonMode ?? false;

    this._raw = ws;

    ws.on('error', error => this.emit('error', error));
    ws.on('message', this._safeMessageHandler.bind(this));

    const safeHandler = this._safeHandler;
    ws.on('close', safeHandler.bind(this, 'close'));
    ws.on('ping', safeHandler.bind(this, 'ping'));
    ws.on('pong', safeHandler.bind(this, 'pong'));
  }

  async * [Symbol.asyncIterator] (): AsyncIterableIterator<JSONValue | Buffer> {
    try {
      for await (const [message] of this._messageIterator()) {
        yield message;
      }
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'AbortError') throw error;
    }
  }

  close (code?: number, reason?: string): void {
    this._raw.close(code, reason);
  }

  async ping (data: Buffer): Promise<void> {
    return await new Promise(resolve => this._raw.ping(data, undefined, () => resolve()));
  }

  async send (message: JSONValue | Buffer): Promise<void> {
    if (!this.jsonMode) return await new Promise(resolve => this._raw.send(message, () => resolve()));
    return new Promise(resolve => this._raw.send(JSON.stringify(message), () => resolve()));
  }

  _messageIterator (): AsyncIterableIterator<Array<JSONValue | Buffer>> {
    // eslint-disable-next-line no-undef
    const ac = new AbortController();

    this._raw.on('close', () => ac.abort());
    return on(this, 'message', {signal: ac.signal});
  }

  _safeHandler <T extends keyof WebSocketControlEvents>(
    event: T, ...args: Parameters<WebSocketControlEvents[T]>
  ): void {
    try {
      this.emit(event, ...args);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  _safeMessageHandler (message: string | Buffer): void {
    try {
      if (!this.jsonMode) {
        this.emit('message', message);
      } else {
        this.emit('message', JSON.parse(message.toString()));
      }
    } catch (error) {
      this.emit('error', error as Error);
    }
  }
}

export {WebSocket};
