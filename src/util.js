import chalk from 'chalk';
import ejs from 'ejs';
import File from './file.js';
import {setTimeout} from 'timers/promises';
import url from 'url';

export async function captureOutput (options, fn) {
  if (typeof options === 'function') fn = options;
  if (options.stdout === undefined) options.stdout = true;

  const output = [];
  const stdout = process.stdout;
  const stderr = process.stderr;
  const stdoutWrite = stdout.write;
  const stderrWrite = stderr.write;
  if (options.stdout) stdout.write = chunk => output.push(chunk);
  if (options.stderr) stderr.write = chunk => output.push(chunk);

  try {
    await fn();
  } finally {
    stdout.write = stdoutWrite;
    stderr.write = stderrWrite;
  }

  return output.length && Buffer.isBuffer(output[0]) ? Buffer.concat(output) : output.join('');
}

export async function cliCreateDir (path) {
  const dir = new File(process.cwd(), ...path.split('/'));
  const stdout = process.stdout;
  if (await dir.exists() === true) {
    stdout.write(chalk.green(' [exists]') + ` ${dir}\n`);
    return;
  }

  stdout.write(chalk.green(' [mkdir]') + ` ${dir}\n`);
  await dir.mkdir({recursive: true});
}

export async function cliCreateFile (path, template, values = {}, options = {}) {
  const file = new File(process.cwd(), ...path.split('/'));
  const stdout = process.stdout;
  if (await file.exists() === true) {
    stdout.write(chalk.red(' [exists]') + ` ${file}\n`);
    return;
  }

  stdout.write(chalk.green(' [write]') + ` ${file}\n`);
  await file.writeFile(ejs.compile(template)(values));
  if (options.chmod !== undefined) {
    stdout.write(chalk.green(' [chmod]') + ` ${file} (${options.chmod.toString(8)})\n`);
    await file.chmod(options.chmod);
  }
}

export async function cliFixPackage () {
  const file = new File(process.cwd(), 'package.json');

  const stdout = process.stdout;
  if (await file.exists() === false) {
    stdout.write(chalk.green(' [write]') + ` ${file}\n`);
    await file.writeFile(JSON.stringify({type: 'module'}, null, 2));
    return;
  }

  const json = JSON.parse(await file.readFile());
  if (json.type === 'module') {
    stdout.write(chalk.green(' [exists]') + ` ${file}\n`);
    return;
  }

  json.type = 'module';
  stdout.write(chalk.green(' [fixed]') + ` ${file}\n`);
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

  const source = [];
  const context = {file: file.toString(), line: lineNumber, column, source};
  let currentLine = 0;
  for await (const line of file.lines({encoding: 'UTF-8'})) {
    currentLine++;
    if (currentLine < startLine) continue;
    if (currentLine > endLine) break;

    source.push({num: currentLine, code: line});
  }

  return context;
}

export async function loadModules (dirs) {
  const modules = {};

  for (const dir of dirs.map(path => new File(path))) {
    if (await dir.exists() === false) continue;
    for await (const file of dir.list({recursive: true})) {
      if (/\.m?js$/.test(file) === false) continue;
      const imports = await import(file.toFileURL());
      const name = dir.relative(file).toArray().join('/').replace(/\.m?js$/, '');
      modules[name] = imports.default ?? null;
    }
  }

  return modules;
}

export const sleep = setTimeout;

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
