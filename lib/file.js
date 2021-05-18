import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import path from 'path';
import readline from 'readline';
import StackUtils from 'stack-utils';
import url from 'url';

export default class File {
  constructor (...parts) {
    this._path = parts.length === 0 ? process.cwd() : parts.length === 1 ? parts[0] : path.join(...parts);
  }

  basename (ext) {
    return path.basename(this._path, ext);
  }

  static callerFile () {
    return new File(url.fileURLToPath(new StackUtils().capture(3)[2].getFileName()));
  }

  child (...parts) {
    return new File(this._path, ...parts);
  }

  chmod (mode) {
    return fsPromises.chmod(this._path, mode);
  }

  createReadStream (options) {
    return fs.createReadStream(this._path, options);
  }

  createWriteStream (options) {
    return fs.createWriteStream(this._path, options);
  }

  static currentFile () {
    return new File(url.fileURLToPath(new StackUtils().capture(2)[1].getFileName()));
  }

  dirname () {
    return new File(path.dirname(this._path));
  }

  exists () {
    return fsPromises.access(this._path, fs.constants.F_OK).then(() => true, () => false);
  }

  existsSync () {
    try {
      fs.accessSync(this._path, fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  extname () {
    return path.extname(this._path);
  }

  isAbsolute () {
    return path.isAbsolute(this._path);
  }

  isReadable () {
    return fsPromises.access(this._path, fs.constants.R_OK).then(() => true, () => false);
  }

  async * list (options = {}) {
    const files = await fsPromises.readdir(this._path, {withFileTypes: true});

    for (const file of files) {
      if (options.hidden !== true && file.name.startsWith('.')) continue;

      const full = path.resolve(this._path, file.name);
      if (file.isDirectory()) {
        if (options.dir === true) yield new File(full);
        if (options.recursive === true) yield * new File(full).list(options);
      } else {
        yield new File(full);
      }
    }
  }

  lines (options) {
    return readline.createInterface({input: this.createReadStream(options), crlfDelay: Infinity});
  }

  mkdir (options) {
    return fsPromises.mkdir(this._path, options);
  }

  readFile (options) {
    return fsPromises.readFile(this._path, options);
  }

  readFileSync (options) {
    return fs.readFileSync(this._path, options);
  }

  relative (to) {
    return new File(path.relative(this._path, '' + to));
  }

  realpath (options) {
    return fsPromises.realpath(this._path, options).then(path => new File(path));
  }

  rm (options) {
    return fsPromises.rm(this._path, options);
  }

  sibling (...parts) {
    return this.dirname().child(...parts);
  }

  stat (options) {
    return fsPromises.stat(this._path, options);
  }

  static tempDir (options) {
    return fsPromises.mkdtemp(path.join(os.tmpdir(), 'mojo-'), options).then(path => {
      tempDirCleanup.push(path);
      return new TempDir(path);
    });
  }

  async touch () {
    const now = new Date();
    try {
      await fsPromises.utimes(this._path, now, now);
    } catch (error) {
      await fsPromises.open(this._path, 'w').then(value => value.close());
    }

    return this;
  }

  toArray () {
    return this._path.split(path.sep);
  }

  toFileURL () {
    return url.pathToFileURL(this._path);
  }

  toString () {
    return `${this._path}`;
  }

  writeFile (data, options) {
    return fsPromises.writeFile(this._path, data, options);
  }
}

class TempDir extends File {
  destroy () {
    return fsPromises.rm(this._path, {recursive: true});
  }
}

const tempDirCleanup = [];
process.on('exit', () => {
  tempDirCleanup.forEach(path => {
    try {
      fs.rmSync(path, {recursive: true});
    } catch (error) {
      if (error.code !== 'ENOENT') throw (error);
    }
  });
});
