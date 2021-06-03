import Context from '../context.js';

export default class WebSocketContext extends Context {
  constructor (app, req, options) {
    super(app, req, options);
    this.jsonMode = false;
    this._ws = null;
  }

  handleUpgrade (ws) {
    this._ws = new WeakRef(ws);
    this.emit('connection', ws);
    ws.on('error', error => this.exception(error));
  }

  get isAccepted () {
    return this.listenerCount('connection') > 0;
  }

  get isEstablished () {
    return this._ws !== null;
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

  get ws () {
    return this._ws?.deref() ?? null;
  }
}
