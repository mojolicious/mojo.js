import EventEmitter, {on} from 'events';

/**
 * Class representing a WebSocket connection.
 * @extends events.EventEmitter
 */
export default class WebSocket extends EventEmitter {
  /**
   * Create WebSocket connection.
   * @param {object} ws - Implementation specific, low level WebSocket object.
   * @param {http.ServerResponse} [handshake] - Handshake response.
   * @param {{jsonMode?: boolean}} [options] - Optional settings.
   */
  constructor (ws, handshake, options) {
    super({captureRejections: true});

    /** @type {http.ServerResponse} - Handshake response. */
    this.handshake = handshake;

    /** @type {boolean} - Automatically JSON encode and decode messages. */
    this.jsonMode = options.jsonMode ?? false;

    this._raw = ws;

    ws.on('error', error => this.emit('error', error));
    ws.on('message', this._safeMessageHandler.bind(this));

    const safeHandler = this._safeHandler;
    ws.on('close', safeHandler.bind(this, 'close'));
    ws.on('ping', safeHandler.bind(this, 'ping'));
    ws.on('pong', safeHandler.bind(this, 'pong'));
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

  /**
   * Close WebSocket connection.
   * @param {number} [code] - WebSocket close code.
   * @param {string} [reason] - WebSocket close reason.
   */
  close (code, reason) {
    this._raw.close(code, reason);
  }

  /**
   * Send WebSocket ping.
   * @param {Buffer} [data] - WebSocket ping payload.
   * @returns {Promise} Resolves after the WebSocket ping has been sent.
   */
  ping (data) {
    return new Promise(resolve => this._raw.ping(data, resolve));
  }

  /**
   * Send WebSocket message.
   * @param {Buffer|object|Array|string|number|true|false|null} message - WebSocket message to send.
   * @returns {Promise} Resolves after the WebSocket message has been sent.
   */
  send (message) {
    if (this.jsonMode !== true) return new Promise(resolve => this._raw.send(message, resolve));
    return new Promise(resolve => this._raw.send(JSON.stringify(message), resolve));
  }

  _messageIterator () {
    // eslint-disable-next-line no-undef
    const ac = new AbortController();

    this._raw.on('close', () => ac.abort());
    return on(this, 'message', {signal: ac.signal});
  }

  _safeHandler (event, ...args) {
    try {
      this.emit(event, ...args);
    } catch (error) {
      this.emit('error', error);
    }
  }

  _safeMessageHandler (message) {
    try {
      if (this.jsonMode !== true) {
        this.emit('message', message);
      } else {
        this.emit('message', JSON.parse(message));
      }
    } catch (error) {
      this.emit('error', error);
    }
  }
}
