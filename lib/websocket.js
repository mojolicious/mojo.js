import EventEmitter, {on} from 'events';

export default class WebSocket extends EventEmitter {
  constructor (ws, handshake, options) {
    super({captureRejections: true});

    this.handshake = handshake;
    this.jsonMode = options.jsonMode ?? false;
    this._raw = ws;

    ws.on('error', error => this.emit('error', error));
    ws.on('close', (code, reason) => this.emit('close', code, reason));

    ws.on('message', this._messageHandler.bind(this));
    ws.on('ping', data => this.emit('ping', data));
    ws.on('pong', data => this.emit('pong', data));
  }

  async * [Symbol.asyncIterator] () {
    try {
      for await (const [message] of this._messageIterator()) {
        yield message;
      }
    } catch (error) {
      if (error.name !== 'AbortError') throw error;
    }
  }

  close (code, reason) {
    this._raw.close(code, reason);
  }

  ping (data) {
    return new Promise(resolve => this._raw.ping(data, resolve));
  }

  send (message) {
    if (this.jsonMode !== true) return new Promise(resolve => this._raw.send(message, resolve));
    return new Promise(resolve => this._raw.send(JSON.stringify(message), resolve));
  }

  _messageHandler (message) {
    if (this.jsonMode !== true) {
      this.emit('message', message);
    } else {
      this.emit('message', JSON.parse(message));
    }
  }

  _messageIterator () {
    // eslint-disable-next-line no-undef
    const ac = new AbortController();

    this._raw.on('close', () => ac.abort());
    return on(this, 'message', {signal: ac.signal});
  }
}
