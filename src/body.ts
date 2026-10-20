import type {JSONValue, UploadOptions} from './types.ts';
import {on} from 'node:events';
import {type Readable, Transform, type Writable} from 'node:stream';
import zlib from 'node:zlib';
import {Params} from './body/params.ts';
import {Headers} from './headers.ts';
import {HTTPError} from './util.ts';
import DOM from '@mojojs/dom';
import busboy from 'busboy';
import * as yaml from 'js-yaml';

interface FileUpload {
  fieldname: string;
  file: Readable;
  filename: string;
  encoding: string;
  mimetype: string;
}

type FormIterator = AsyncIterableIterator<[string, Readable, {filename: string; encoding: string; mimeType: string}]>;

/**
 * HTTP message body base class.
 */
export class Body {
  /**
   * Automatically decompress message body if necessary.
   */
  autoDecompress = true;
  /**
   * HTTP headers.
   */
  headers: Headers;
  /**
   * Maximum message body size in bytes, after decompression, unlimited by default.
   */
  maxMessageSize: number | undefined = undefined;

  _form: Params | undefined = undefined;
  _stream: Readable;

  constructor(headers: string[], stream: Readable) {
    this._stream = stream;
    this.headers = new Headers(headers);
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
    const stream = this._stream;
    if (stream.readableEnded === true) throw new Error('Request body has already been consumed');

    const max = this.maxMessageSize;
    if (max !== undefined && parseInt(this.get('Content-Length') ?? '0') > max) throw messageTooLarge();

    let body = stream;
    if (this.autoDecompress === true && this.get('content-encoding') === 'gzip') {
      const gunzip = zlib.createGunzip();
      stream.on('error', error => gunzip.destroy(error));
      body = stream.pipe(gunzip);
    }
    if (max === undefined) return body;

    // Count after decompression, so small gzip bodies cannot unpack to huge ones
    let size = 0;
    const limit = new Transform({
      transform(chunk, encoding, cb) {
        size += chunk.length;
        cb(size > max ? messageTooLarge() : null, chunk);
      }
    });
    body.on('error', error => limit.destroy(error));
    return body.pipe(limit);
  }

  /**
   * Get async iterator for uploaded files from message body.
   * @example
   * // Iterate over uploaded files
   * for await (const {fieldname, file, filename} of body.files()) {
   *   const parts = [];
   *   for await (const chunk of file) {
   *     parts.push(chunk);
   *   }
   *   const content = Buffer.concat(parts).toString();
   *   console.write(`${fieldname}: ${content}`);
   * }
   */
  async *files(options?: UploadOptions): AsyncIterableIterator<FileUpload> {
    if (this._isForm() === false) return;

    try {
      for await (const [fieldname, file, {filename, encoding, mimeType}] of this._formIterator(options)) {
        yield {fieldname, file, filename, encoding, mimetype: mimeType};
      }
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'AbortError') throw error;
    }
  }

  /**
   * Get form parameters from message body.
   * @example
   * // Get a specific parameter
   * const params = await body.form();
   * const foo = params.get('foo');
   */
  async form(options?: UploadOptions): Promise<Params> {
    if (this._form === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of this.files(options));
    }

    return this._params;
  }

  /**
   * Get HTTP header from message.
   * @example
   * // Get User-Agent header
   * const agent = body.get('User-Agent');
   */
  get(name: string): string | null {
    return this.headers.get(name);
  }

  /**
   * Get HTML message body as `@mojojs/dom` object.
   */
  async html(): Promise<DOM> {
    return new DOM(await this.text());
  }

  /**
   * Get JSON message body as parsed data structure.
   */
  async json<T = JSONValue>(): Promise<T> {
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
   * Set HTTP header for message.
   * // Set Server header
   * body.set('Server', 'mojo.js');
   */
  set(name: string, value: string): this {
    this.headers.set(name, value);
    return this;
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

  _formIterator(options?: UploadOptions): FormIterator {
    const ac = new AbortController();

    const type = this.get('Content-Type') ?? '';
    const params = this._params;

    const bb = busboy({headers: {'content-type': type, ...this.headers.toObject()}, ...options});
    bb.on('field', (fieldname, val) => params.append(fieldname, val));
    bb.on('end', () => ac.abort()).on('close', () => ac.abort());
    const files = on(bb, 'file', {signal: ac.signal}) as FormIterator;
    this.createReadStream()
      .on('error', error => bb.destroy(error))
      .pipe(bb);

    return files;
  }

  _isForm(): boolean {
    const type = this.get('Content-Type');
    if (type === null) return false;
    return type.startsWith('application/x-www-form-urlencoded') || type.startsWith('multipart/form-data');
  }

  get _params(): Params {
    if (this._form === undefined) this._form = new Params();
    return this._form;
  }
}

function messageTooLarge(): HTTPError {
  return new HTTPError(413, 'Maximum message size exceeded');
}
