import Context from '../context.js';

export default class WebSocketContext extends Context {
  get isWebSocket () {
    return true;
  }

  json (fn) {
    this.json = true;
    return this.on('connection', fn);
  }

  plain (fn) {
    return this.on('connection', fn);
  }
}
