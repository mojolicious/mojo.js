import Context from '../context.js';

export default class WebSocketContext extends Context {
  constructor (app, req, options) {
    super(app, req, options);
    this.jsonMode = false;
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
