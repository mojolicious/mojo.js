import Context from '../context.js';

export default class WebSocketContext extends Context {
  constructor (app, req, options) {
    super(app, req, options);
    this.jsonMode = false;
    this._ws = null;
  }

  close (code, reason) {
    if (this._ws !== null) this._ws.deref().close(code, reason);
  }

  handleUpgrade (ws) {
    this._ws = new WeakRef(ws);
    this.emit('connection', ws);
    ws.on('error', error => this.exception(error));
  }

  get isAccepted () {
    return this.listenerCount('connection') > 0;
  }

  get isWebSocket () {
    return true;
  }

  json (fn) {
    this.jsonMode = true;
    return this.on('connection', fn);
  }

  plain (fn) {
    return this.on('connection', fn);
  }
}
