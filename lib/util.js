'use strict';

import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import path from 'path';
import {promisify} from 'util';
import File from './file.js';

function escapeRegExp (string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const sleep = promisify(setTimeout);

function tablify (rows = []) {
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

class TempDir extends File {
  destroy () {
    return fsPromises.rm(this.path, {recursive: true});
  }
}

const tempdirCleanup = [];
function tempdir (...args) {
  return fsPromises.mkdtemp(path.join(os.tmpdir(), 'mojo-'), ...args).then(path => {
    tempdirCleanup.push(path);
    return new TempDir(path);
  });
}
process.on('exit', () => {
  tempdirCleanup.forEach(path => {
    try {
      fs.rmSync(path, {recursive: true});
    } catch (error) {
      if (error.code !== 'ENOENT') throw (error);
    }
  });
});

const util = {escapeRegExp, sleep, tablify, tempdir};

export default util;
export {util, escapeRegExp, sleep, tablify, tempdir};
