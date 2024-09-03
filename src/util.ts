import type {Mode} from 'node:fs';
import {setTimeout} from 'node:timers/promises';
import Path from '@mojojs/path';
import Template from '@mojojs/template';
import chalk from 'chalk';
export * from '@mojojs/util';

interface FixOptions {
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
}

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
 * Create directory for generator commands.
 */
export async function cliCreateDir(path: string): Promise<void> {
  const dir = new Path(process.cwd(), ...path.split('/'));
  const {stdout} = process;
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
  const {stdout} = process;
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

  const {stdout} = process;
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
 * Get mojo.js devDependencies.
 */
export async function devDependencies(regex: RegExp): Promise<Record<string, string>> {
  const pkg = JSON.parse((await Path.currentFile().dirname().sibling('package.json').readFile('utf8')).toString());

  const deps: Record<string, string> = {};
  for (const [name, version] of Object.entries(pkg.devDependencies)) {
    if (regex.test(name) === true) deps[name] = version as string;
  }

  return deps;
}

/**
 * Generate exception context.
 */
export async function exceptionContext(
  error: Error,
  options: {lines?: number} = {}
): Promise<{file: string; line: number; column: number; source: {num: number; code: string}[]} | null> {
  const stack = error.stack ?? '';
  const match = stack.split('\n')[1].match(/^\s*at .+ \(([^)]+):(\d+):(\d+)\)\s*$/);
  if (match === null || match[1].startsWith('file://') === false) return null;

  const lines = options.lines ?? 3;
  const file = Path.fromFileURL(match[1]);
  const lineNumber = parseInt(match[2]);
  const column = parseInt(match[3]);

  const startLine = lineNumber - lines <= 0 ? 1 : lineNumber - lines;
  const endLine = lineNumber + lines;

  const source: {num: number; code: string}[] = [];
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
