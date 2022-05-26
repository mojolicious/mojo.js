import type {JSONValue} from './types.js';
import type {Mode} from 'fs';
import {setTimeout} from 'timers/promises';
import Path from '@mojojs/path';
import Template from '@mojojs/template';
import chalk from 'chalk';
export {SafeString} from '@mojojs/template';

type FixOptions = {
  author?: string;
  dependencies?: Record<string, string>;
  description?: string;
  devDependencies?: Record<string, string>;
  exports?: string;
  files?: string[];
  license?: string;
  name?: string;
  scripts?: Record<string, string>;
  version?: string;
};

// Unmarked codes are from RFC 7231
export const httpStatusMessages: Record<number, string> = {
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing', // RFC 2518 (WebDAV)
  103: 'Early Hints', // RFC 8297
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  207: 'Multi-Status', // RFC 2518 (WebDAV)
  208: 'Already Reported', // RFC 5842
  226: 'IM Used', // RFC 3229
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect', // RFC 7538
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Request Entity Too Large',
  414: 'Request-URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Request Range Not Satisfiable',
  417: 'Expectation Failed',
  418: "I'm a teapot", // RFC 2324 :)
  421: 'Misdirected Request', // RFC 7540
  422: 'Unprocessable Entity', // RFC 2518 (WebDAV)
  423: 'Locked', // RFC 2518 (WebDAV)
  424: 'Failed Dependency', // RFC 2518 (WebDAV)
  425: 'Too Early', // RFC 8470
  426: 'Upgrade Required', // RFC 2817
  428: 'Precondition Required', // RFC 6585
  429: 'Too Many Requests', // RFC 6585
  431: 'Request Header Fields Too Large', // RFC 6585
  451: 'Unavailable For Legal Reasons', // RFC 7725
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates', // RFC 2295
  507: 'Insufficient Storage', // RFC 2518 (WebDAV)
  508: 'Loop Detected', // RFC 5842
  509: 'Bandwidth Limit Exceeded', // Unofficial
  510: 'Not Extended', // RFC 2774
  511: 'Network Authentication Required' // RFC 6585
};

/**
 * Capture STDOUT/STDERR output.
 */
export async function captureOutput(
  fn: () => Promise<void> | void,
  options: {stderr?: boolean; stdout?: boolean} = {}
): Promise<string | Buffer> {
  if (options.stdout === undefined) options.stdout = true;

  const output: Uint8Array[] = [];
  const stdout = process.stdout;
  const stderr = process.stderr;
  const stdoutWrite = stdout.write;
  const stderrWrite = stderr.write;

  if (options.stdout === true) {
    stdout.write = (buffer: Uint8Array): boolean => {
      output.push(buffer);
      return true;
    };
  }
  if (options.stderr === true) {
    stderr.write = (buffer: Uint8Array) => {
      output.push(buffer);
      return true;
    };
  }

  try {
    await fn();
  } finally {
    stdout.write = stdoutWrite;
    stderr.write = stderrWrite;
  }

  return output.length > 0 && Buffer.isBuffer(output[0]) ? Buffer.concat(output) : output.join('');
}

/**
 * Create directory for generator commands.
 */
export async function cliCreateDir(path: string): Promise<void> {
  const dir = new Path(process.cwd(), ...path.split('/'));
  const stdout = process.stdout;
  if ((await dir.exists()) === true) {
    stdout.write(chalk.green(' [exists]') + ` ${dir.toString()}\n`);
    return;
  }

  stdout.write(chalk.green(' [mkdir]') + ` ${dir.toString()}\n`);
  await dir.mkdir({recursive: true});
}

/**
 * Create file for generator commands.
 */
export async function cliCreateFile(
  path: string,
  template: string,
  values: Record<string, any> = {},
  options: {chmod?: Mode} = {}
): Promise<void> {
  const file = new Path(process.cwd(), ...path.split('/'));
  const stdout = process.stdout;
  if ((await file.exists()) === true) {
    stdout.write(chalk.red(' [exists]') + ` ${file.toString()}\n`);
    return;
  }

  stdout.write(chalk.green(' [write]') + ` ${file.toString()}\n`);
  await file.writeFile(await Template.render(template, values));
  if (options.chmod !== undefined) {
    stdout.write(chalk.green(' [chmod]') + ` ${file.toString()} (${options.chmod.toString(8)})\n`);
    await file.chmod(options.chmod);
  }
}

/**
 * Fix package.json file for generator commands.
 */
export async function cliFixPackage(options: FixOptions = {}): Promise<void> {
  const file = new Path(process.cwd(), 'package.json');

  const stdout = process.stdout;
  let pkg: Record<string, any>;
  if ((await file.exists()) === false) {
    pkg = {};
  } else {
    pkg = JSON.parse((await file.readFile()).toString());
  }

  // All mojo.js applications are ESM
  pkg.type = 'module';

  for (const [name, value] of Object.entries(options)) {
    // String
    if (typeof value === 'string') {
      if (pkg[name] === undefined) pkg[name] = value;
    }
    // Array
    else if (Array.isArray(value)) {
      pkg[name] = [...new Set([...(pkg[name] ?? []), ...value])];
    }
    // Object
    else {
      if (pkg[name] === undefined) pkg[name] = {};
      for (const [key, val] of Object.entries(value)) {
        if (pkg[name][key] === undefined) pkg[name][key] = val;
      }
    }
  }

  stdout.write(chalk.green(' [fixed]') + ` ${file.toString()}\n`);
  await file.writeFile(JSON.stringify(pkg, null, 2));
}

/**
 * Decode URI component, but do not throw an exception if it fails.
 */
export function decodeURIComponentSafe(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return null;
  }
}

/**
 * Generate exception context.
 */
export async function exceptionContext(
  error: Error,
  options: {lines?: number} = {}
): Promise<{file: string; line: number; column: number; source: Array<{num: number; code: string}>} | null> {
  const stack = error.stack ?? '';
  const match = stack.split('\n')[1].match(/^\s*at .+ \(([^)]+):(\d+):(\d+)\)\s*$/);
  if (match === null || match[1].startsWith('file://') === false) return null;

  const lines = options.lines ?? 3;
  const file = Path.fromFileURL(match[1]);
  const lineNumber = parseInt(match[2]);
  const column = parseInt(match[3]);

  const startLine = lineNumber - lines <= 0 ? 1 : lineNumber - lines;
  const endLine = lineNumber + lines;

  const source: Array<{num: number; code: string}> = [];
  const context = {file: file.toString(), line: lineNumber, column, source};
  let currentLine = 0;
  for await (const line of file.lines({encoding: 'utf8'})) {
    currentLine++;
    if (currentLine < startLine) continue;
    if (currentLine > endLine) break;

    source.push({num: currentLine, code: line});
  }

  return context;
}

/**
 * JSON pointers.
 */
export function jsonPointer(value: JSONValue, pointer: string): JSONValue | undefined {
  if (pointer.startsWith('/') === false) return pointer.length > 0 ? null : value;

  let data: any = value;
  for (const part of pointer.replace(/^\//, '').split('/')) {
    const unescaped = part.replaceAll('~1', '/').replaceAll('~0', '~');

    if (typeof data === 'object' && data !== null && data[unescaped] !== undefined) {
      data = data[unescaped];
    } else if (Array.isArray(data) && /^\d+$/.test(unescaped) === true) {
      data = data[parseInt(unescaped)];
    } else {
      return undefined;
    }
  }

  return data;
}

/**
 * Load modules.
 */
export async function loadModules(dirs: string[]): Promise<Record<string, any>> {
  const modules: Record<string, any> = {};

  for (const dir of dirs.map(path => new Path(path))) {
    if ((await dir.exists()) === false) continue;
    for await (const file of dir.list({recursive: true})) {
      if (/\.m?js$/.test(file.toString()) === false) continue;
      const imports = await import(file.toFileURL().toString());
      const name = dir
        .relative(file)
        .toArray()
        .join('/')
        .replace(/\.m?js$/, '');
      modules[name] = imports.default ?? null;
    }
  }

  return modules;
}

/**
 * Sleep asynchronously.
 */
export const sleep = setTimeout;

/**
 * Tablify data structure.
 */
export function tablify(rows: string[][] = []): string {
  const spec: number[] = [];

  const table = rows.map(row => {
    return row.map((col, i) => {
      col = `${col ?? ''}`.replace(/[\r\n]/g, '');
      if (col.length >= (spec[i] ?? 0)) spec[i] = col.length;
      return col;
    });
  });

  const lines = table.map(row => row.map((col, i) => (i === row.length - 1 ? col : col.padEnd(spec[i]))).join('  '));
  return lines.join('\n') + '\n';
}

/**
 * Escape all POSIX control characters except for `\n`.
 */
export function termEscape(value: string): string {
  return [...value]
    .map(char =>
      // eslint-disable-next-line no-control-regex
      /^[\x00-\x09\x0b-\x1f\x7f\x80-\x9f]$/.test(char) ? '\\x' + char.charCodeAt(0).toString(16).padStart(2, '0') : char
    )
    .join('');
}
