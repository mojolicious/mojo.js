import chalk from 'chalk';
import ejs from 'ejs';
import File from './file.js';
import {promisify} from 'util';
import url from 'url';

export async function captureOutput (options, fn) {
  if (typeof options === 'function') fn = options;
  if (options.stdout === undefined) options.stdout = true;

  const output = [];
  const stdoutWrite = process.stdout.write;
  const stderrWrite = process.stderr.write;
  if (options.stdout) process.stdout.write = chunk => output.push(chunk);
  if (options.stderr) process.stderr.write = chunk => output.push(chunk);

  try {
    await fn();
  } finally {
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
  }

  return output.length && Buffer.isBuffer(output[0]) ? Buffer.concat(output) : output.join('');
}

export async function cliCreateDir (path) {
  const dir = new File(process.cwd(), ...path.split('/'));
  if (await dir.exists()) {
    process.stdout.write(chalk.green(' [exists]') + ` ${dir}\n`);
    return;
  }

  process.stdout.write(chalk.green(' [mkdir]') + ` ${dir}\n`);
  await dir.mkdir({recursive: true});
}

export async function cliCreateFile (path, template, values = {}, options = {}) {
  const file = new File(process.cwd(), ...path.split('/'));
  if (await file.exists()) {
    process.stdout.write(chalk.red(' [exists]') + ` ${file}\n`);
    return;
  }

  process.stdout.write(chalk.green(' [write]') + ` ${file}\n`);
  await file.writeFile(ejs.compile(template)(values));
  if (options.chmod !== undefined) {
    process.stdout.write(chalk.green(' [chmod]') + ` ${file} (${options.chmod.toString(8)})\n`);
    await file.chmod(options.chmod);
  }
}

export async function cliFixPackage () {
  const file = new File(process.cwd(), 'package.json');

  if (!(await file.exists())) {
    process.stdout.write(chalk.green(' [write]') + ` ${file}\n`);
    await file.writeFile(JSON.stringify({type: 'module'}, null, 2));
    return;
  }

  const json = JSON.parse(await file.readFile());
  if (json.type === 'module') {
    process.stdout.write(chalk.green(' [exists]') + ` ${file}\n`);
    return;
  }

  json.type = 'module';
  process.stdout.write(chalk.green(' [fixed]') + ` ${file}\n`);
  await file.writeFile(JSON.stringify(json, null, 2));
}

export function decodeURIComponentSafe (value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return null;
  }
}

export async function exceptionContext (error, options = {}) {
  const match = error.stack.split('\n')[1].match(/^\s*at .+ \(([^)]+):(\d+):(\d+)\)\s*$/);
  if (match === null) return null;

  const lines = options.lines ?? 3;
  const file = new File(match[1].startsWith('file://') ? url.fileURLToPath(match[1]) : match[1]);
  const lineNumber = parseInt(match[2]);
  const column = parseInt(match[3]);

  const startLine = (lineNumber - lines) <= 0 ? 1 : lineNumber - lines;
  const endLine = lineNumber + lines;

  const context = {file: file.toString(), line: lineNumber, column, source: []};
  let currentLine = 0;
  for await (const line of file.lines({encoding: 'UTF-8'})) {
    currentLine++;
    if (currentLine < startLine) continue;
    if (currentLine > endLine) break;

    context.source.push({num: currentLine, code: line});
  }

  return context;
}

export async function optionalDependency (name) {
  try {
    return await import(name);
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    throw new Error(`This feature requires "${name}" to be installed`);
  }
}

export const sleep = promisify(setTimeout);

export function tablify (rows = []) {
  const spec = [];

  const table = rows.map(row => {
    return row.map((col, i) => {
      col = (col == null ? '' : typeof col === 'string' ? col : '' + col).replace(/[\r\n]/g, '');
      if (col.length >= (spec[i] || 0)) spec[i] = col.length;
      return col;
    });
  });

  const lines = table.map(row => row.map((col, i) => i === row.length - 1 ? col : col.padEnd(spec[i])).join('  '));
  return lines.join('\n') + '\n';
}
