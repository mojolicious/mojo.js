import type {JSONValue} from './types.js';
import type {IncomingHttpHeaders, IncomingMessage} from 'http';
import type {Socket} from 'net';
import type {Readable, Writable} from 'stream';
import {on} from 'events';
import zlib from 'zlib';
import {Params} from './body/params.js';
import DOM from '@mojojs/dom';
import busboy from 'busboy';
import yaml from 'js-yaml';

interface UploadOptions {
  limits?: {
    fieldNameSize?: number;
    fieldSize?: number;
    fields?: number;
    fileSize?: number;
    files?: number;
    parts?: number;
    headerPairs?: number;
  };
}

interface FileUpload {
  fieldname: string;
  file: Readable;
  filename: string;
  encoding: string;
  mimetype: string;
}

type TLSSocket = Socket & {encrypted: boolean | undefined};

/**
 * HTTP message body base class.
 */
export class Body {
  /**
   * Automatically decompress message body if necessary.
   */
  autoDecompress = true;

  _form: Params | undefined = undefined;
  _raw: IncomingMessage;

  constructor(stream: IncomingMessage) {
    this._raw = stream;
  }

  async *[Symbol.asyncIterator](): AsyncIterable<Buffer> {
    yield* this.createReadStream();
  }

  /**
   * Get message body as `Buffer` object.
   */
  async buffer(): Promise<Buffer> {
    return Buffer.concat(await this._consumeBody());
  }

  /**
   * Get message body as a readable stream.
   */
  createReadStream(): Readable {
    if (this.autoDecompress !== true || this.get('content-encoding') !== 'gzip') return this._raw;

    const gunzip = zlib.createGunzip();
    this._raw.pipe(gunzip);
    return gunzip;
  }

  /**
   * Get async iterator for uploaded files from message body.
   */
  async *files(options?: UploadOptions): AsyncIterableIterator<FileUpload> {
    if (this._isForm() === false) return;

    try {
      for await (const [fieldname, file, name, encoding, mimetype] of this._formIterator(options)) {
        const filename = (name as any).filename as string;
        yield {fieldname, file, filename, encoding, mimetype};
      }
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'AbortError') throw error;
    }
  }

  /**
   * Get form parameters from message body.
   */
  async form(options?: UploadOptions): Promise<Params> {
    if (this._form === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const upload of this.files(options)) {
        // We only care about the side effects
      }
    }

    return this._params;
  }

  /**
   * Get HTTP header from message.
   */
  get(name: string): string | undefined {
    const header = this._raw.headers[name.toLowerCase()];
    return Array.isArray(header) ? header.join(',') : header;
  }

  /**
   * Get HTTP headers from message.
   */
  get headers(): IncomingHttpHeaders {
    return this._raw.headers;
  }

  /**
   * Get HTML message body as `@mojojs/dom` object.
   */
  async html(): Promise<DOM> {
    return new DOM(await this.text());
  }

  /**
   * Get HTTP version.
   */
  get httpVersion(): string {
    return this._raw.httpVersion;
  }

  /**
   * Check if underlying socket was encrypted with TLS.
   */
  get isSecure(): boolean {
    const socket = this._raw.socket as TLSSocket;
    return socket.encrypted ?? false;
  }

  /**
   * Get JSON message body as parsed data structure.
   */
  async json(): Promise<JSONValue> {
    return JSON.parse((await this.buffer()).toString());
  }

  /**
   * Pipe message body to writable stream.
   */
  async pipe(writer: Writable): Promise<void> {
    return await new Promise((resolve, reject) => {
      this.createReadStream().on('error', reject).pipe(writer).on('unpipe', resolve);
    });
  }

  /**
   * Get message body as string.
   */
  async text(charset: BufferEncoding = 'utf8'): Promise<string> {
    return (await this.buffer()).toString(charset);
  }

  /**
   * Get XML message body as `@mojojs/dom` object.
   */
  async xml(): Promise<DOM> {
    return new DOM(await this.text(), {xml: true});
  }

  /**
   * Get YAML message body as parsed data structure.
   */
  async yaml(): Promise<unknown> {
    return yaml.load((await this.buffer()).toString());
  }

  async _consumeBody(): Promise<Uint8Array[]> {
    const chunks: Uint8Array[] = [];
    return await new Promise((resolve, reject) => {
      this.createReadStream()
        .on('data', chunk => chunks.push(Buffer.from(chunk)))
        .on('error', reject)
        .on('end', () => resolve(chunks));
    });
  }

  _formIterator(options?: UploadOptions): AsyncIterableIterator<[string, Readable, string, string, string]> {
    const ac = new AbortController();

    const raw = this._raw;
    const headers = raw.headers;
    const type = headers['content-type'] ?? '';
    const params = this._params;

    const bb = busboy({headers: {'content-type': type, ...headers}, ...options});
    bb.on('field', (fieldname, val) => params.append(fieldname, val));
    bb.on('end', () => ac.abort()).on('close', () => ac.abort());
    const files = on(bb, 'file', {signal: ac.signal});
    raw.pipe(bb);

    return files;
  }

  _isForm(): boolean {
    const type = this._raw.headers['content-type'];
    if (type === undefined) return false;
    return type.startsWith('application/x-www-form-urlencoded') || type.startsWith('multipart/form-data');
  }

  get _params(): Params {
    if (this._form === undefined) this._form = new Params();
    return this._form;
  }
}
