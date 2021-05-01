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
    this.formatter = options.formatter || defaultFormatter;
    this.destination = options.destination || process.stderr;
    this._level = LEVEL[process.env.MOJO_LOG_LEVEL || options.level || 'debug'];
  }

  child (prefix) {
    return new ChildLogger(this, prefix);
  }

  debug (...args) {
    if (this._level <= LEVEL.debug) this._log('debug', ...args);
  }

  error (...args) {
    if (this._level <= LEVEL.error) this._log('error', ...args);
  }

  fatal (...args) {
    if (this._level <= LEVEL.fatal) this._log('fatal', ...args);
  }

  info (...args) {
    if (this._level <= LEVEL.info) this._log('info', ...args);
  }

  get level () {
    return Object.keys(LEVEL).find(key => LEVEL[key] === this._level);
  }

  set level (level) {
    this._level = LEVEL[level];
  }

  trace (...args) {
    if (this._level <= LEVEL.trace) this._log('trace', ...args);
  }

  warn (...args) {
    if (this._level <= LEVEL.warn) this._log('warn', ...args);
  }

  _log (level, ...args) {
    if (this.destination === undefined) return;
    if (typeof args[0] === 'function') args = [args[0]()];
    this.destination.write(this.formatter(new Date(), level, ...args));
  }
}

class ChildLogger {
  constructor (parent, prefix) {
    this.parent = parent;
    this.prefix = prefix;
  }

  debug (...args) {
    this.parent.debug(this.prefix, ...args);
  }

  error (...args) {
    this.parent.error(this.prefix, ...args);
  }

  fatal (...args) {
    this.parent.fatal(this.prefix, ...args);
  }

  info (...args) {
    this.parent.info(this.prefix, ...args);
  }

  trace (...args) {
    this.parent.trace(this.prefix, ...args);
  }

  warn (...args) {
    this.parent.warn(this.prefix, ...args);
  }
}

function defaultFormatter (time, level, ...args) {
  return `[${time.toISOString()}] [${level}] ${args.join(' ')}\n`;
}
