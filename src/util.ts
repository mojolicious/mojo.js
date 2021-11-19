import type {JSONValue} from './types.js';
import type {Mode} from 'fs';
import {setTimeout} from 'timers/promises';
import url from 'url';
import Path from '@mojojs/path';
import chalk from 'chalk';
import ejs from 'ejs';

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

const EMPTY_HTML_TAGS: Record<string, boolean> = {
  area: true,
  base: true,
  br: true,
  col: true,
  embed: true,
  hr: true,
  img: true,
  input: true,
  keygen: true,
  link: true,
  menuitem: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  wbr: true
};

export async function captureOutput(
  fn: () => void,
  options: {stderr?: boolean; stdout?: boolean} = {}
): Promise<string | Buffer> {
  if (options.stdout === undefined) options.stdout = true;

  const output: Uint8Array[] = [];
  const stdout = process.stdout;
  const stderr = process.stderr;
  const stdoutWrite = stdout.write;
  const stderrWrite = stderr.write;

  if (options.stdout) {
    stdout.write = (chunk: Uint8Array) => {
      output.push(chunk);
      return true;
    };
  }
  if (options.stderr === true) {
    stderr.write = (chunk: Uint8Array) => {
      output.push(chunk);
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

export async function cliCreateDir(path: string): Promise<void> {
  const dir = new Path(process.cwd(), ...path.split('/'));
  const stdout = process.stdout;
  if (await dir.exists()) {
    stdout.write(chalk.green(' [exists]') + ` ${dir.toString()}\n`);
    return;
  }

  stdout.write(chalk.green(' [mkdir]') + ` ${dir.toString()}\n`);
  await dir.mkdir({recursive: true});
}

export async function cliCreateFile(
  path: string,
  template: string,
  values: Record<string, any> = {},
  options: {chmod?: Mode} = {}
): Promise<void> {
  const file = new Path(process.cwd(), ...path.split('/'));
  const stdout = process.stdout;
  if (await file.exists()) {
    stdout.write(chalk.red(' [exists]') + ` ${file.toString()}\n`);
    return;
  }

  stdout.write(chalk.green(' [write]') + ` ${file.toString()}\n`);
  await file.writeFile(ejs.compile(template)(values));
  if (options.chmod !== undefined) {
    stdout.write(chalk.green(' [chmod]') + ` ${file.toString()} (${options.chmod.toString(8)})\n`);
    await file.chmod(options.chmod);
  }
}

export async function cliFixPackage(): Promise<void> {
  const file = new Path(process.cwd(), 'package.json');

  const stdout = process.stdout;
  if (!(await file.exists())) {
    stdout.write(chalk.green(' [write]') + ` ${file.toString()}\n`);
    await file.writeFile(JSON.stringify({type: 'module'}, null, 2));
    return;
  }

  const json = JSON.parse((await file.readFile()).toString());
  if (json.type === 'module') {
    stdout.write(chalk.green(' [exists]') + ` ${file.toString()}\n`);
    return;
  }

  json.type = 'module';
  stdout.write(chalk.green(' [fixed]') + ` ${file.toString()}\n`);
  await file.writeFile(JSON.stringify(json, null, 2));
}

export function decodeURIComponentSafe(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return null;
  }
}

export function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function exceptionContext(
  error: Error,
  options: {lines?: number} = {}
): Promise<{file: string; line: number; column: number; source: Array<{num: number; code: string}>} | null> {
  const stack = error.stack ?? '';
  const match = stack.split('\n')[1].match(/^\s*at .+ \(([^)]+):(\d+):(\d+)\)\s*$/);
  if (match === null) return null;

  const lines = options.lines ?? 3;
  const file = new Path(match[1].startsWith('file://') ? url.fileURLToPath(match[1]) : match[1]);
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

export function htmlEscape(value: string | SafeString): string {
  if (value instanceof SafeString) return value.toString();
  return value.replace(/[&<>'"]/g, htmlReplace);
}

function htmlReplace(char: string): string {
  return HTML_ESCAPE[char] ?? char;
}

export function htmlTag(
  name: string,
  attrs: Record<string, string> | string | SafeString = {},
  content: string | SafeString = ''
): SafeString {
  if (typeof attrs === 'string' || attrs instanceof SafeString) [content, attrs] = [attrs, {}];
  const result: string[] = [];

  result.push('<', name);
  for (const [name, value] of Object.entries(attrs)) {
    result.push(' ', name, '="', htmlEscape(value), '"');
  }
  result.push('>');

  if (!EMPTY_HTML_TAGS[name]) {
    result.push(content instanceof SafeString ? content.toString() : htmlEscape(content), '</', name, '>');
  }

  return new SafeString(result.join(''));
}

export function jsonPointer(value: JSONValue, pointer: string): JSONValue | undefined {
  if (!pointer.startsWith('/')) return pointer.length > 0 ? null : value;

  let data: any = value;
  for (const part of pointer.replace(/^\//, '').split('/')) {
    const unescaped = part.replaceAll('~1', '/').replaceAll('~0', '~');

    if (typeof data === 'object' && data !== null && data[unescaped] !== undefined) {
      data = data[unescaped];
    } else if (Array.isArray(data) && /^\d+$/.test(unescaped)) {
      data = data[parseInt(unescaped)];
    } else {
      return undefined;
    }
  }

  return data;
}

export async function loadModules(dirs: string[]): Promise<Record<string, any>> {
  const modules: Record<string, any> = {};

  for (const dir of dirs.map(path => new Path(path))) {
    if (!(await dir.exists())) continue;
    for await (const file of dir.list({recursive: true})) {
      if (!/\.m?js$/.test(file.toString())) continue;
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

export const sleep = setTimeout;

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

export class SafeString {
  _safe: string;

  constructor(safe: string) {
    this._safe = safe;
  }

  toString(): string {
    return this._safe;
  }
}
