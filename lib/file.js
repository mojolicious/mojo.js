import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import path from 'path';
import StackUtils from 'stack-utils';
import url from 'url';

export default class File {
  constructor (...parts) {
    this.path = parts.length >= 1 ? path.join(...parts) : process.cwd();
  }

  basename (...args) {
    return path.basename(this.path, ...args);
  }

  child (...parts) {
    return new File(this.path, ...parts);
  }

  createReadStream (...args) {
    return fs.createReadStream(this.path, ...args);
  }

  createWriteStream (...args) {
    return fs.createWriteStream(this.path, ...args);
  }

  dirname (...args) {
    return new File(path.dirname(this.path, ...args));
  }

  exists () {
    return fsPromises.access(this.path, fs.constants.F_OK).then(() => true, () => false);
  }

  extname (...args) {
    return path.extname(this.path, ...args);
  }

  isReadable () {
    return fsPromises.access(this.path, fs.constants.R_OK).then(() => true, () => false);
  }

  async * list (options = {}) {
    const files = await fsPromises.readdir(this.path, {withFileTypes: true});

    for (const file of files) {
      if (!options.hidden && file.name.startsWith('.')) continue;

      const full = path.resolve(this.path, file.name);
      if (file.isDirectory()) {
        if (options.dir) yield new File(full);
        if (options.recursive) yield * new File(full).list(options);
      } else {
        yield new File(full);
      }
    }
  }

  mkdir (...args) {
    return fsPromises.mkdir(this.path, ...args);
  }

  readFile (...args) {
    return fsPromises.readFile(this.path, ...args);
  }

  readFileSync (...args) {
    return fs.readFileSync(this.path, ...args);
  }

  relative (to) {
    return new File(path.relative(this.path, '' + to));
  }

  realpath (...args) {
    return fsPromises.realpath(this.path, ...args).then(path => new File(path));
  }

  rm (...args) {
    return fsPromises.rm(this.path, ...args);
  }

  stat (...args) {
    return fsPromises.stat(this.path, ...args);
  }

  toArray () {
    return this.path.split(path.sep);
  }

  toString () {
    return `${this.path}`;
  }

  writeFile (...args) {
    return fsPromises.writeFile(this.path, ...args);
  }
}

function callerFile () {
  return new File(url.fileURLToPath(new StackUtils().capture(3)[2].getFileName()));
}

class TempDir extends File {
  destroy () {
    return fsPromises.rm(this.path, {recursive: true});
  }
}

const tempDirCleanup = [];
function tempDir (...args) {
  return fsPromises.mkdtemp(path.join(os.tmpdir(), 'mojo-'), ...args).then(path => {
    tempDirCleanup.push(path);
    return new TempDir(path);
  });
}
process.on('exit', () => {
  tempDirCleanup.forEach(path => {
    try {
      fs.rmSync(path, {recursive: true});
    } catch (error) {
      if (error.code !== 'ENOENT') throw (error);
    }
  });
});

export {callerFile, tempDir, File};
