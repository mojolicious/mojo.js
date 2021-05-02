import Context from '../context.js';

export default class WebSocketContext extends Context {
  get isWebSocket () {
    return true;
  }
}
