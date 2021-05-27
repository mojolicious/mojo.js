import EventEmitter from 'events';

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
}
