import type {WriteStream} from 'node:fs';
import assert from 'node:assert';
import chalk from 'chalk';

interface LogContext {
  requestId?: string;
  [key: string]: any;
}
interface LogEvent extends LogContext {
  level: string;
  time: string;
  msg: string;
}
type LogFormatter = (data: LogEvent) => string;

const LEVEL: Record<string, number> = {
  fatal: 2,
  error: 3,
  warn: 4,
  info: 5,
  debug: 6,
  trace: 7
};

/**
 * A simple logger class.
 */
export class Logger {
  /**
   * Log destination stream.
   */
  destination: NodeJS.WritableStream;
  /**
   * Log formatter.
   */
  formatter: LogFormatter;
  /**
   * The last few logged messages.
   */
  history: LogEvent[] = [];

  _capture: CapturedLogs | undefined = undefined;
  _historySize: number | undefined;
  _level = 7;

  constructor(
    options: {destination?: WriteStream; formatter?: LogFormatter; historySize?: number; level?: string} = {}
  ) {
    this.destination = options.destination ?? process.stderr;
    this.formatter = options.formatter ?? Logger.colorFormatter;
    this.level = process.env.MOJO_LOG_LEVEL ?? options.level ?? 'trace';

    this._historySize = options.historySize;
  }

  /**
   * Capture log messages for as long as the returned object has not been stopped, useful for testing log messages.
   */
  capture(level: string = this.level): CapturedLogs {
    if (this._capture !== undefined) throw new Error('Log messages are already being captured');

    const original = this.level;
    this.level = level;

    this._capture = new CapturedLogs(() => {
      this.level = original;
      this._capture = undefined;
    });

    return this._capture;
  }

  /**
   * Create a child logger that will include context information with every log message.
   */
  child(context: LogContext): ChildLogger {
    return new ChildLogger(this, context);
  }

  /**
   * Log formatter with color highlighting.
   */
  static colorFormatter(data: LogEvent): string {
    const formatted = Logger.stringFormatter(data);
    if (data.level === 'error' || data.level === 'fatal') return chalk.red(formatted);
    if (data.level === 'warn') return chalk.yellow(formatted);
    return formatted;
  }

  /**
   * Log `debug` message.
   */
  debug(msg: string, context?: LogContext): void {
    if (this._level >= LEVEL.debug) this._log('debug', msg, context);
  }

  /**
   * Log formatter without color highlighting.
   */
  static stringFormatter(data: LogEvent): string {
    if (data.requestId !== undefined) return `[${data.time}] [${data.level}] [${data.requestId}] ${data.msg}\n`;
    return `[${data.time}] [${data.level}] ${data.msg}\n`;
  }

  /**
   * Log formatter for systemd.
   */
  static systemdFormatter(data: LogEvent): string {
    if (data.requestId === undefined) return `<${LEVEL[data.level]}>[${data.level.substring(0, 1)}] ${data.msg}\n`;
    return `<${LEVEL[data.level]}>[${data.level.substring(0, 1)}] [${data.requestId}] ${data.msg}\n`;
  }

  /**
   * Log `error` message.
   */
  error(msg: string, context?: LogContext): void {
    if (this._level >= LEVEL.error) this._log('error', msg, context);
  }

  /**
   * Log `fatal` message.
   */
  fatal(msg: string, context?: LogContext): void {
    if (this._level >= LEVEL.fatal) this._log('fatal', msg, context);
  }

  /**
   * Log `infor` message.
   */
  info(msg: string, context?: LogContext): void {
    if (this._level >= LEVEL.info) this._log('info', msg, context);
  }

  /**
   * JSON log formatter.
   */
  static jsonFormatter(data: LogEvent): string {
    return JSON.stringify(data);
  }

  /**
   * Currently active log level.
   */
  get level(): string {
    return Object.keys(LEVEL).find(key => LEVEL[key] === this._level) as string;
  }

  set level(level: string) {
    assert(LEVEL[level] !== undefined, `Unsupported log level "${level}"`);
    this._level = LEVEL[level];
  }

  /**
   * Log `trace` message.
   */
  trace(msg: string, context?: LogContext): void {
    if (this._level >= LEVEL.trace) this._log('trace', msg, context);
  }

  /**
   * Log `warn` message.
   */
  warn(msg: string, context?: LogContext): void {
    if (this._level >= LEVEL.warn) this._log('warn', msg, context);
  }

  _log(level: string, msg: string, context?: LogContext): void {
    const data: LogEvent = {...context, time: new Date().toISOString(), msg, level};

    if (this._historySize !== undefined) {
      const history = this.history;
      history.push(data);
      const maxHistorySize = this._historySize;
      const historySize = history.length;
      if (historySize > maxHistorySize) history.splice(0, historySize - maxHistorySize);
    }

    const formatted = this.formatter(data);
    if (this._capture === undefined) {
      this.destination.write(formatted);
    } else {
      this._capture.push(formatted);
    }
  }
}

/**
 * Captured log message class.
 */
class CapturedLogs extends Array<string> {
  _cb: () => void;
  _stopped = false;

  constructor(cb: () => void) {
    super();
    this._cb = cb;
  }

  /**
   * Stop capturing log messages.
   */
  stop(): void {
    if (this._stopped === true) return;
    this._cb();
    this._stopped = true;
  }

  /**
   * Turn log messages into a string.
   */
  toString(): string {
    return this.join('');
  }
}

/**
 * Child logger class.
 */
export class ChildLogger {
  parent: Logger;
  context: LogContext;

  constructor(parent: Logger, context: LogContext) {
    this.parent = parent;
    this.context = context;
  }

  /**
   * Log `debug` message.
   */
  debug(msg: string): void {
    this.parent.debug(msg, this.context);
  }

  /**
   * Log `error` message.
   */
  error(msg: string): void {
    this.parent.error(msg, this.context);
  }

  /**
   * Log `fatal` message.
   */
  fatal(msg: string): void {
    this.parent.fatal(msg, this.context);
  }

  /**
   * Log `info` message.
   */
  info(msg: string): void {
    this.parent.info(msg, this.context);
  }

  /**
   * Log `trace` message.
   */
  trace(msg: string): void {
    this.parent.trace(msg, this.context);
  }

  /**
   * Log `warn` message.
   */
  warn(msg: string): void {
    this.parent.warn(msg, this.context);
  }
}
