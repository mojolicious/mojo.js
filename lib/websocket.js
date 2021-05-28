import EventEmitter, {on} from 'events';

export default class WebSocket extends EventEmitter {
  constructor (ws, handshake) {
    super();

    this.handshake = handshake;
    this._raw = ws;

    ws.on('error', error => this.emit('error', error));
    ws.on('close', (code, reason) => this.emit('close', code, reason));

    ws.on('message', message => this.emit('message', message));
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

  pong (data) {
    return new Promise(resolve => this._raw.pong(data, resolve));
  }

  send (message) {
    return new Promise(resolve => this._raw.send(message, resolve));
  }

  _messageIterator () {
    // eslint-disable-next-line no-undef
    const ac = new AbortController();

    this._raw.on('close', () => ac.abort());
    return on(this._raw, 'message', {signal: ac.signal});
  }
}
