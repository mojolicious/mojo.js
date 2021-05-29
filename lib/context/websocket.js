import Context from '../context.js';

export default class WebSocketContext extends Context {
  constructor (app, req, options) {
    super(app, req, options);
    this.jsonMode = false;
  }

  handleUpgrade (ws) {
    this.emit('connection', ws);
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
