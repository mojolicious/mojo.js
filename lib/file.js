'use strict';

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

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

  exists () {
    return fsPromises.access(this.path, fs.constants.F_OK).then(() => true, () => false);
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

  realpath (...args) {
    return fsPromises.realpath(this.path, ...args).then(path => new File(path));
  }

  rm (...args) {
    return fsPromises.rm(this.path, ...args);
  }

  stat (...args) {
    return fsPromises.stat(this.path, ...args);
  }

  toString () {
    return `${this.path}`;
  }

  writeFile (...args) {
    return fsPromises.writeFile(this.path, ...args);
  }
}
