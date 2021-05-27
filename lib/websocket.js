import EventEmitter, {on} from 'events';

export default class WebSocket extends EventEmitter {
  constructor (ws) {
    super();

    this._raw = ws;

    ws.on('error', error => this.emit('error', error));

    ws.on('upgrade', res => this.emit('upgrade', res));
    ws.on('open', () => this.emit('open'));
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
    this._raw.ping(data);
  }

  pong (data) {
    this._raw.pong(data);
  }

  send (message, fn) {
    this._raw.send(message, fn);
  }

  _messageIterator () {
    // eslint-disable-next-line no-undef
    const ac = new AbortController();

    this._raw.on('close', () => ac.abort());
    return on(this._raw, 'message', {signal: ac.signal});
  }
}
