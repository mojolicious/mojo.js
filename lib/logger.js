import chalk from 'chalk';

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
    if (options.color === undefined) options.color = true;
    this.formatters = formatters;
    this.formatter = options.formatter || (options.color ? colorFormatter : defaultFormatter);
    this.destination = options.destination || process.stderr;
    this.history = [];
    this.historySize = options.historySize ?? 0;
    this._level = LEVEL[process.env.MOJO_LOG_LEVEL || options.level || 'debug'];
  }

  child (prefix) {
    return new ChildLogger(this, prefix);
  }

  debug (...messages) {
    if (this._level <= LEVEL.debug) this._log('debug', ...messages);
  }

  error (...messages) {
    if (this._level <= LEVEL.error) this._log('error', ...messages);
  }

  fatal (...messages) {
    if (this._level <= LEVEL.fatal) this._log('fatal', ...messages);
  }

  info (...messages) {
    if (this._level <= LEVEL.info) this._log('info', ...messages);
  }

  get level () {
    return Object.keys(LEVEL).find(key => LEVEL[key] === this._level);
  }

  set level (level) {
    this._level = LEVEL[level];
  }

  trace (...messages) {
    if (this._level <= LEVEL.trace) this._log('trace', ...messages);
  }

  warn (...messages) {
    if (this._level <= LEVEL.warn) this._log('warn', ...messages);
  }

  _log (level, ...messages) {
    if (typeof messages[0] === 'function') messages = [messages[0]()];

    if (this.historySize === 0) {
      this.destination.write(this.formatter(new Date(), level, ...messages));
    } else {
      const entry = [new Date(), level, ...messages];
      this.history.push(entry);
      while (this.history.length > this.historySize) {
        this.history.shift();
      }
      this.destination.write(this.formatter(...entry));
    }
  }
}

class ChildLogger {
  constructor (parent, prefix) {
    this.parent = parent;
    this.prefix = prefix;
  }

  debug (...messages) {
    this.parent.debug(this.prefix, ...messages);
  }

  error (...messages) {
    this.parent.error(this.prefix, ...messages);
  }

  fatal (...messages) {
    this.parent.fatal(this.prefix, ...messages);
  }

  info (...messages) {
    this.parent.info(this.prefix, ...messages);
  }

  trace (...messages) {
    this.parent.trace(this.prefix, ...messages);
  }

  warn (...messages) {
    this.parent.warn(this.prefix, ...messages);
  }
}

function colorFormatter (time, level, ...messages) {
  const formatted = defaultFormatter(time, level, ...messages);
  if (level === 'error' || level === 'fatal') return chalk.red(formatted);
  if (level === 'warn') return chalk.yellow(formatted);
  return formatted;
}

function defaultFormatter (time, level, ...messages) {
  return `[${time.toISOString()}] [${level}] ${messages.join(' ')}\n`;
}

const formatters = {colorFormatter, defaultFormatter};
