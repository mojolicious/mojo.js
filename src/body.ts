import type {JSONValue} from './types.js';
import type {IncomingHttpHeaders, IncomingMessage} from 'http';
import type {Socket} from 'net';
import {on} from 'events';
import {Params} from './body/params.js';
import Busboy from 'busboy';
import cheerio from 'cheerio';

type BusboyFile = [string, NodeJS.ReadableStream, string, string, string];

interface FileUpload {
  fieldname: string,
  file: NodeJS.ReadableStream,
  filename: string,
  encoding: string,
  mimetype: string
}

type TLSSocket = Socket & {encrypted: boolean | undefined};

export class Body {
  raw: IncomingMessage;
  _form: Params | undefined = undefined;

  constructor (stream: IncomingMessage) {
    this.raw = stream;
  }

  async * [Symbol.asyncIterator] (): AsyncIterable<Buffer> {
    yield * this.raw;
  }

  async buffer (): Promise<Buffer> {
    return Buffer.concat(await this._consumeBody());
  }

  async * files (options?: busboy.BusboyConfig): AsyncIterableIterator<FileUpload> {
    if (!this._isForm()) return;

    try {
      for await (const [fieldname, file, filename, encoding, mimetype] of this._formIterator(options)) {
        yield {fieldname, file, filename, encoding, mimetype};
      }
    } catch (error) {
      if (error.name !== 'AbortError') throw error;
    }
  }

  async form (options?: busboy.BusboyConfig): Promise<Params> {
    if (this._form === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars, no-empty
      for await (const upload of this.files(options)) {
        // We only care about the side effects
      }
    }

    return this._params;
  }

  get (name: string): string | undefined {
    const header = this.raw.headers[name.toLowerCase()];
    return (typeof header === 'object') ? header.join(',') : header;
  }

  get headers (): IncomingHttpHeaders {
    return this.raw.headers;
  }

  async html (): Promise<cheerio.Root> {
    return cheerio.load(await this.buffer());
  }

  get isSecure (): boolean {
    const socket = this.raw.socket as TLSSocket;
    return socket.encrypted ?? false;
  }

  async json (): Promise<JSONValue> {
    return JSON.parse((await this.buffer()).toString());
  }

  async pipe (writer: NodeJS.WritableStream): Promise<void> {
    const raw = this.raw;
    raw.pipe(writer);
    return await new Promise((resolve, reject) => raw.on('error', reject).on('end', resolve));
  }

  async text (charset: BufferEncoding = 'utf8'): Promise<string> {
    return (await this.buffer()).toString(charset);
  }

  async xml (): Promise<cheerio.Root> {
    return cheerio.load(await this.buffer(), {xmlMode: true});
  }

  async _consumeBody (): Promise<Uint8Array[]> {
    const chunks: Uint8Array[] = [];
    return await new Promise((resolve, reject) => {
      this.raw.on('data', chunk => chunks.push(Buffer.from(chunk)))
        .on('error', reject)
        .on('end', () => resolve(chunks));
    });
  }

  _formIterator (options?: busboy.BusboyConfig): AsyncIterableIterator<BusboyFile> {
    // eslint-disable-next-line no-undef
    const ac = new AbortController();

    const raw = this.raw;
    const params = this._params;
    const busboy = new Busboy({headers: raw.headers, ...options});
    busboy.on('field', (fieldname, val) => params.append(fieldname, val));
    busboy.on('end', () => ac.abort()).on('finish', () => ac.abort());
    const files = on(busboy, 'file', {signal: ac.signal});
    raw.pipe(busboy);

    return files;
  }

  _isForm (): boolean {
    const type = this.raw.headers['content-type'];
    if (type === undefined) return false;
    return type.startsWith('application/x-www-form-urlencoded') || type.startsWith('multipart/form-data');
  }

  get _params (): Params {
    if (this._form === undefined) this._form = new Params();
    return this._form;
  }
}
