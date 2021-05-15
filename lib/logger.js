import chalk from 'chalk';

const LEVEL = Object.freeze({
  fatal: 2,
  error: 3,
  warn: 4,
  info: 5,
  debug: 6,
  trace: 7
});

export default class Logger {
  constructor (options = {}) {
    this.formatter = options.formatter || Logger.colorFormatter;
    this.destination = options.destination || process.stderr;
    this.history = [];
    this.historySize = options.historySize ?? 0;
    this._level = LEVEL[process.env.MOJO_LOG_LEVEL || options.level || 'debug'];
  }

  child (context) {
    return new ChildLogger(this, context);
  }

  static colorFormatter (data) {
    const formatted = Logger.stringFormatter(data);
    if (data.level === 'error' || data.level === 'fatal') return chalk.red(formatted);
    if (data.level === 'warn') return chalk.yellow(formatted);
    return formatted;
  }

  debug (msg, context) {
    if (this._level >= LEVEL.debug) this._log('debug', msg, context);
  }

  static stringFormatter (data) {
    if (data.requestId !== undefined) return `[${data.time}] [${data.level}] [${data.requestId}] ${data.msg}\n`;
    return `[${data.time}] [${data.level}] ${data.msg}\n`;
  }

  static systemdFormatter (data) {
    if (data.requestId === undefined) return `<${LEVEL[data.level]}>[${data.level.substring(0, 1)}] ${data.msg}\n`;
    return `<${LEVEL[data.level]}>[${data.level.substring(0, 1)}] [${data.requestId}] ${data.msg}\n`;
  }

  error (msg, context) {
    if (this._level >= LEVEL.error) this._log('error', msg, context);
  }

  fatal (msg, context) {
    if (this._level >= LEVEL.fatal) this._log('fatal', msg, context);
  }

  info (msg, context) {
    if (this._level >= LEVEL.info) this._log('info', msg, context);
  }

  static jsonFormatter (data) {
    return JSON.stringify(data);
  }

  get level () {
    return Object.keys(LEVEL).find(key => LEVEL[key] === this._level);
  }

  set level (level) {
    this._level = LEVEL[level];
  }

  trace (msg, context) {
    if (this._level >= LEVEL.trace) this._log('trace', msg, context);
  }

  warn (msg, context) {
    if (this._level >= LEVEL.warn) this._log('warn', msg, context);
  }

  _log (level, msg, context) {
    const data = {...context, time: new Date().toISOString(), msg, level};
    if (this.historySize === 0) {
      this.destination.write(this.formatter(data));
    } else {
      this.history.push(data);
      while (this.history.length > this.historySize) {
        this.history.shift();
      }
      this.destination.write(this.formatter(data));
    }
  }
}

class ChildLogger {
  constructor (parent, context) {
    this.parent = parent;
    this.context = context;
  }

  debug (msg) {
    this.parent.debug(msg, this.context);
  }

  error (msg) {
    this.parent.error(msg, this.context);
  }

  fatal (msg) {
    this.parent.fatal(msg, this.context);
  }

  info (msg) {
    this.parent.info(msg, this.context);
  }

  trace (msg) {
    this.parent.trace(msg, this.context);
  }

  warn (msg) {
    this.parent.warn(msg, this.context);
  }
}
