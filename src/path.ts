import type EventEmitter from 'events';
import type stream from 'stream';
import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import path from 'path';
import readline from 'readline';
import url from 'url';
import StackUtils from 'stack-utils';

interface StreamOptions {
  flags?: string,
  encoding?: BufferEncoding,
  fd?: number | fsPromises.FileHandle,
  mode?: number,
  autoClose?: boolean,
  emitClose?: boolean,
  start?: number,
  highWaterMark?: number
}

interface ReadStreamOptions extends StreamOptions {
  end?: number
}

type NodeError = Error & {code: string};

export class Path {
  _path = '';

  constructor (...parts: string[]) {
    this._path = parts.length === 0 ? process.cwd() : parts.length === 1 ? parts[0] : path.join(...parts);
  }

  async access (mode: number): Promise<boolean> {
    return await fsPromises.access(this._path, mode).then(() => true, () => false);
  }

  accessSync (mode: number): boolean {
    try {
      fs.accessSync(this._path, mode);
      return true;
    } catch (error) {
      return false;
    }
  }

  basename (ext?: string): string {
    return path.basename(this._path, ext);
  }

  static callerFile (): Path {
    return new Path(url.fileURLToPath(new StackUtils().capture(3)[2].getFileName() ?? ''));
  }

  child (...parts: string[]): Path {
    return new Path(this._path, ...parts);
  }

  async chmod (mode: fs.Mode): Promise<void> {
    return await fsPromises.chmod(this._path, mode);
  }

  async copyFile (destFile: Path, flags?: number): Promise<void> {
    return await fsPromises.copyFile(this._path, destFile.toString(), flags);
  }

  copyFileSync (destFile: Path, flags?: number): void {
    fs.copyFileSync(this._path, destFile.toString(), flags);
  }

  createReadStream (options?: string | ReadStreamOptions): fs.ReadStream {
    return fs.createReadStream(this._path, options);
  }

  createWriteStream (options?: string | StreamOptions): fs.WriteStream {
    return fs.createWriteStream(this._path, options);
  }

  static currentFile (): Path {
    return new Path(url.fileURLToPath(new StackUtils().capture(2)[1].getFileName() ?? ''));
  }

  dirname (): Path {
    return new Path(path.dirname(this._path));
  }

  async exists (): Promise<boolean> {
    return await this.access(fs.constants.F_OK);
  }

  existsSync (): boolean {
    return this.accessSync(fs.constants.F_OK);
  }

  extname (): string {
    return path.extname(this._path);
  }

  isAbsolute (): boolean {
    return path.isAbsolute(this._path);
  }

  async isReadable (): Promise<boolean> {
    return await this.access(fs.constants.R_OK);
  }

  isReadableSync (): boolean {
    return this.accessSync(fs.constants.R_OK);
  }

  async * list (options: {dir?: boolean, hidden?: boolean, recursive?: boolean} = {}): AsyncIterable<Path> {
    const files = await fsPromises.readdir(this._path, {withFileTypes: true});

    for (const file of files) {
      if (options.hidden !== true && file.name.startsWith('.')) continue;

      const full = path.resolve(this._path, file.name);
      if (file.isDirectory()) {
        if (options.dir === true) yield new Path(full);
        if (options.recursive === true) yield * new Path(full).list(options);
      } else {
        yield new Path(full);
      }
    }
  }

  lines (options?: stream.ReadableOptions): readline.Interface {
    return readline.createInterface({input: this.createReadStream(options), crlfDelay: Infinity});
  }

  async mkdir (options?: fs.MakeDirectoryOptions & {recursive: true}): Promise<string | undefined> {
    return await fsPromises.mkdir(this._path, options);
  }

  mkdirSync (options?: fs.MakeDirectoryOptions & {recursive: true}): this {
    fs.mkdirSync(this._path, options);
    return this;
  }

  async readFile (
    options?: BufferEncoding | (fs.BaseEncodingOptions & EventEmitter.Abortable & {flag?: fs.OpenMode})
  ): Promise<string | Buffer> {
    return await fsPromises.readFile(this._path, options);
  }

  readFileSync (options?: BufferEncoding | (fs.BaseEncodingOptions & {flag?: string})): string | Buffer {
    return fs.readFileSync(this._path, options);
  }

  relative (to: Path): Path {
    return new Path(path.relative(this._path, to.toString()));
  }

  async rename (newFile: Path): Promise<void> {
    return await fsPromises.rename(this._path, newFile.toString());
  }

  renameSync (newFile: Path): void {
    fs.renameSync(this._path, newFile.toString());
  }

  async realpath (options?: fs.BaseEncodingOptions): Promise<Path> {
    return await fsPromises.realpath(this._path, options).then(path => new Path(path));
  }

  realpathSync (options?: fs.BaseEncodingOptions): Path {
    return new Path(fs.realpathSync(this._path, options));
  }

  async rm (options?: fs.RmOptions): Promise<void> {
    return await fsPromises.rm(this._path, options);
  }

  rmSync (options?: fs.RmOptions): void {
    fs.rmSync(this._path, options);
  }

  sibling (...parts: string[]): Path {
    return this.dirname().child(...parts);
  }

  async stat (options?: fs.StatOptions): Promise<fs.Stats | fs.BigIntStats> {
    return await fsPromises.stat(this._path, options);
  }

  statSync (options?: fs.StatOptions): fs.Stats | fs.BigIntStats | undefined {
    return fs.statSync(this._path, options);
  }

  static async tempDir (options?: fs.BaseEncodingOptions): Promise<TempDir> {
    return await fsPromises.mkdtemp(path.join(os.tmpdir(), 'node-'), options).then(path => {
      tempDirCleanup.push(path);
      return new TempDir(path);
    });
  }

  static tempDirSync (options?: fs.BaseEncodingOptions): TempDir {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-'), options);
    tempDirCleanup.push(dir);
    return new TempDir(dir);
  }

  async open (flags: string | number, mode?: fs.Mode): Promise<fsPromises.FileHandle> {
    return await fsPromises.open(this._path, flags, mode);
  }

  async touch (): Promise<this> {
    const now = new Date();
    try {
      await fsPromises.utimes(this._path, now, now);
    } catch (error) {
      await this.open('w').then(async value => await value.close());
    }

    return this;
  }

  touchSync (): this {
    const now = new Date();
    try {
      fs.utimesSync(this._path, now, now);
    } catch (error) {
      fs.closeSync(fs.openSync(this._path, 'w'));
    }

    return this;
  }

  toArray (): string[] {
    return this._path.split(path.sep);
  }

  toFileURL (): URL {
    return url.pathToFileURL(this._path);
  }

  toString (): string {
    return `${this._path}`;
  }

  async utimes (atime: string | number | Date, mtime: string | number | Date): Promise<this> {
    await fsPromises.utimes(this._path, atime, mtime);
    return this;
  }

  utimesSync (atime: string | number | Date, mtime: string | number | Date): this {
    fs.utimesSync(this._path, atime, mtime);
    return this;
  }

  async writeFile (
    data: string | Uint8Array,
    options?: BufferEncoding | (fs.BaseEncodingOptions & {mode?: fs.Mode, flag?: fs.OpenMode} & EventEmitter.Abortable)
  ): Promise<void> {
    return await fsPromises.writeFile(this._path, data, options);
  }

  writeFileSync (data: string | Uint8Array, options?: fs.WriteFileOptions): void {
    fs.writeFileSync(this._path, data, options);
  }
}

class TempDir extends Path {
  async destroy (): Promise<void> {
    return await fsPromises.rm(this._path, {recursive: true});
  }

  destroySync (): void {
    fs.rmSync(this._path, {recursive: true});
  }
}

const tempDirCleanup: string[] = [];
process.on('exit', () => {
  for (const path of tempDirCleanup) {
    try {
      fs.rmSync(path, {recursive: true});
    } catch (error) {
      if (!(error instanceof Error) || (error as NodeError).code !== 'ENOENT') throw error;
    }
  }
});
