import type {JSONValue} from './types.js';
import type {WriteStream} from 'fs';
import assert from 'assert';
import chalk from 'chalk';

interface LogContext { requestId?: string, [key: string]: JSONValue | undefined }
interface LogEvent extends LogContext { level: string, time: string, msg: string }
type LogFormatter = (data: LogEvent) => string;

const LEVEL: Record<string, number> = Object.freeze({
  fatal: 2,
  error: 3,
  warn: 4,
  info: 5,
  debug: 6,
  trace: 7
});

export class Logger {
  destination: NodeJS.WritableStream;
  formatter: LogFormatter;
  history: LogEvent[] = [];
  _historySize: number;
  _level = 6;

  constructor (
    options: {destination?: WriteStream, formatter?: LogFormatter, historySize?: number, level?: string} = {}
  ) {
    this.destination = options.destination ?? process.stderr;
    this.formatter = options.formatter ?? Logger.colorFormatter;
    this.level = process.env.MOJO_LOG_LEVEL ?? options.level ?? 'debug';

    this._historySize = options.historySize ?? 0;
  }

  child (context: LogContext): ChildLogger {
    return new ChildLogger(this, context);
  }

  static colorFormatter (data: LogEvent): string {
    const formatted = Logger.stringFormatter(data);
    if (data.level === 'error' || data.level === 'fatal') return chalk.red(formatted);
    if (data.level === 'warn') return chalk.yellow(formatted);
    return formatted;
  }

  debug (msg: string, context?: LogContext): void {
    if (this._level >= LEVEL.debug) this._log('debug', msg, context);
  }

  static stringFormatter (data: LogEvent): string {
    if (data.requestId !== undefined) return `[${data.time}] [${data.level}] [${data.requestId}] ${data.msg}\n`;
    return `[${data.time}] [${data.level}] ${data.msg}\n`;
  }

  static systemdFormatter (data: LogEvent): string {
    if (data.requestId === undefined) return `<${LEVEL[data.level]}>[${data.level.substring(0, 1)}] ${data.msg}\n`;
    return `<${LEVEL[data.level]}>[${data.level.substring(0, 1)}] [${data.requestId}] ${data.msg}\n`;
  }

  error (msg: string, context?: LogContext): void {
    if (this._level >= LEVEL.error) this._log('error', msg, context);
  }

  fatal (msg: string, context?: LogContext): void {
    if (this._level >= LEVEL.fatal) this._log('fatal', msg, context);
  }

  info (msg: string, context?: LogContext): void {
    if (this._level >= LEVEL.info) this._log('info', msg, context);
  }

  static jsonFormatter (data: LogEvent): string {
    return JSON.stringify(data);
  }

  get level (): string {
    return Object.keys(LEVEL).find(key => LEVEL[key] === this._level) as string;
  }

  set level (level: string) {
    assert(LEVEL[level] !== undefined, `Unsupported log level "${level}"`);
    this._level = LEVEL[level];
  }

  trace (msg: string, context?: LogContext): void {
    if (this._level >= LEVEL.trace) this._log('trace', msg, context);
  }

  warn (msg: string, context?: LogContext): void {
    if (this._level >= LEVEL.warn) this._log('warn', msg, context);
  }

  _log (level: string, msg: string, context?: LogContext): void {
    const data: LogEvent = {...context, time: new Date().toISOString(), msg, level};
    if (this._historySize === 0) {
      this.destination.write(this.formatter(data));
    } else {
      const history = this.history;
      const historySize = this._historySize;

      history.push(data);
      while (history.length > historySize) {
        history.shift();
      }

      this.destination.write(this.formatter(data));
    }
  }
}

export class ChildLogger {
  parent: Logger;
  context: LogContext;

  constructor (parent: Logger, context: LogContext) {
    this.parent = parent;
    this.context = context;
  }

  debug (msg: string): void {
    this.parent.debug(msg, this.context);
  }

  error (msg: string): void {
    this.parent.error(msg, this.context);
  }

  fatal (msg: string): void {
    this.parent.fatal(msg, this.context);
  }

  info (msg: string): void {
    this.parent.info(msg, this.context);
  }

  trace (msg: string): void {
    this.parent.trace(msg, this.context);
  }

  warn (msg: string): void {
    this.parent.warn(msg, this.context);
  }
}
