'use strict';

const fs = require('fs');
const fsPromises = require('fs/promises');
const os = require('os');
const path = require('path');
const util = require('util');
const File = require('./file');

function escapeRegExp (string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const sleep = util.promisify(setTimeout);

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

module.exports = {escapeRegExp, sleep, tablify, tempdir};
