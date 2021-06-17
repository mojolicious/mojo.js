import type EventEmitter from 'events';
import type {ReadStreamOptions, StreamOptions} from './types.js';
import type stream from 'stream';

import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import path from 'path';
import readline from 'readline';
import StackUtils from 'stack-utils';
import url from 'url';

export default class File {
  _path = '';

  constructor (...parts: string[]) {
    this._path = parts.length === 0 ? process.cwd() : parts.length === 1 ? parts[0] : path.join(...parts);
  }

  basename (ext?: string): string {
    return path.basename(this._path, ext);
  }

  static callerFile (): File {
    return new File(url.fileURLToPath(new StackUtils().capture(3)[2].getFileName() ?? ''));
  }

  child (...parts: string[]): File {
    return new File(this._path, ...parts);
  }

  async chmod (mode: fs.Mode): Promise<void> {
    return await fsPromises.chmod(this._path, mode);
  }

  async copyFile (destFile: File, flags?: number): Promise<void> {
    return await fsPromises.copyFile(this._path, destFile.toString(), flags);
  }

  createReadStream (options?: string | ReadStreamOptions): fs.ReadStream {
    return fs.createReadStream(this._path, options);
  }

  createWriteStream (options?: string | StreamOptions): fs.WriteStream {
    return fs.createWriteStream(this._path, options);
  }

  static currentFile (): File {
    return new File(url.fileURLToPath(new StackUtils().capture(2)[1].getFileName() ?? ''));
  }

  dirname (): File {
    return new File(path.dirname(this._path));
  }

  async exists (): Promise<boolean> {
    return await fsPromises.access(this._path, fs.constants.F_OK).then(() => true, () => false);
  }

  existsSync (): boolean {
    try {
      fs.accessSync(this._path, fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  extname (): string {
    return path.extname(this._path);
  }

  isAbsolute (): boolean {
    return path.isAbsolute(this._path);
  }

  async isReadable (): Promise<boolean> {
    return await fsPromises.access(this._path, fs.constants.R_OK).then(() => true, () => false);
  }

  async * list (options: {dir?: boolean, hidden?: boolean, recursive?: boolean} = {}): AsyncIterable<File> {
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

  lines (options?: stream.ReadableOptions): readline.Interface {
    return readline.createInterface({input: this.createReadStream(options), crlfDelay: Infinity});
  }

  async mkdir (options?: fs.MakeDirectoryOptions & {recursive: true}): Promise<string | undefined> {
    return await fsPromises.mkdir(this._path, options);
  }

  async readFile (
    options?: BufferEncoding | (fs.BaseEncodingOptions & EventEmitter.Abortable & {flag?: fs.OpenMode})
  ): Promise<string | Buffer> {
    return await fsPromises.readFile(this._path, options);
  }

  readFileSync (options?: BufferEncoding | (fs.BaseEncodingOptions & {flag?: string})): string | Buffer {
    return fs.readFileSync(this._path, options);
  }

  relative (to: File): File {
    return new File(path.relative(this._path, to.toString()));
  }

  async rename (newFile: File): Promise<void> {
    return await fsPromises.rename(this._path, newFile.toString());
  }

  async realpath (options?: fs.BaseEncodingOptions): Promise<File> {
    return await fsPromises.realpath(this._path, options).then(path => new File(path));
  }

  async rm (options?: fs.RmOptions): Promise<void> {
    return await fsPromises.rm(this._path, options);
  }

  sibling (...parts: string[]): File {
    return this.dirname().child(...parts);
  }

  async stat (options?: fs.StatOptions): Promise<fs.Stats | fs.BigIntStats> {
    return await fsPromises.stat(this._path, options);
  }

  static async tempDir (options?: fs.BaseEncodingOptions): Promise<TempDir> {
    return await fsPromises.mkdtemp(path.join(os.tmpdir(), 'mojo-'), options).then(path => {
      tempDirCleanup.push(path);
      return new TempDir(path);
    });
  }

  async touch (): Promise<this> {
    const now = new Date();
    try {
      await fsPromises.utimes(this._path, now, now);
    } catch (error) {
      await fsPromises.open(this._path, 'w').then(async value => await value.close());
    }

    return this;
  }

  toArray (): string[] {
    return this._path.split(path.sep);
  }

  toFileURL (): url.URL {
    return url.pathToFileURL(this._path);
  }

  toString (): string {
    return `${this._path}`;
  }

  async writeFile (
    data: string | Uint8Array,
    options?: BufferEncoding | (
      fs.BaseEncodingOptions & {mode?: fs.Mode, flag?: fs.OpenMode} & EventEmitter.Abortable
    )
  ): Promise<void> {
    return await fsPromises.writeFile(this._path, data, options);
  }
}

class TempDir extends File {
  async destroy (): Promise<void> {
    return await fsPromises.rm(this._path, {recursive: true});
  }
}

const tempDirCleanup: string[] = [];
process.on('exit', () => {
  tempDirCleanup.forEach(path => {
    try {
      fs.rmSync(path, {recursive: true});
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  });
});
