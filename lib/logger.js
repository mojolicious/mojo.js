const LEVEL = Object.freeze({
  trace: 1,
  debug: 2,
  info: 3,
  warn: 4,
  error: 5,
  fatal: 6
});

export default class Logger {
  constructor (options = {}) {
    this.destination = options.destination || process.stderr;
    this._level = LEVEL[process.env.MOJO_LOG_LEVEL || options.level || 'debug'];
  }

  debug (msg) {
    if (this._level <= LEVEL.debug) this._log('debug', msg);
  }

  error (msg) {
    if (this._level <= LEVEL.error) this._log('error', msg);
  }

  fatal (msg) {
    if (this._level <= LEVEL.fatal) this._log('fatal', msg);
  }

  info (msg) {
    if (this._level <= LEVEL.info) this._log('info', msg);
  }

  get level () {
    return Object.keys(LEVEL).find(key => LEVEL[key] === this._level);
  }

  set level (level) {
    this._level = LEVEL[level];
  }

  trace (msg) {
    if (this._level <= LEVEL.trace) this._log('trace', msg);
  }

  warn (msg) {
    if (this._level <= LEVEL.warn) this._log('warn', msg);
  }

  _log (level, msg) {
    if (!this.destination) return;
    if (typeof msg === 'function') msg = msg();
    const now = new Date();
    this.destination.write(defaultFormat(now, level, msg));
  }
}

function defaultFormat (time, level, msg) {
  if (msg instanceof Array) return `[${time}] [${level}] ${msg.join(' ')}\n`;
  return `[${time.toISOString()}] [${level}] ${msg}\n`;
}
