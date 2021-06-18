
import {on} from 'events';

import Params from './body/params.js';

import Busboy from 'busboy';
import cheerio from 'cheerio';

export default class Body {
  constructor (stream) {
    this.raw = stream;

    this._form = undefined;
  }

  async * [Symbol.asyncIterator] () {
    yield * this.raw;
  }

  async buffer () {
    return Buffer.concat(await this._consumeBody());
  }

  async * files (options) {
    if (this._form !== undefined) return;
    this._form = new Params();
    if (this._isForm() !== true) return;

    try {
      for await (const [fieldname, file, filename, encoding, mimetype] of this._formIterator(options)) {
        yield {fieldname, file, filename, encoding, mimetype};
      }
    } catch (error) {
      if (error.name !== 'AbortError') throw error;
    }
  }

  async form (options) {
    if (this._form === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars, no-empty
      for await (const upload of this.files(options)) {
        // We only care about the side effects
      }
    }

    return this._form;
  }

  get (name) {
    return this.raw.headers[name.toLowerCase()];
  }

  async html () {
    return cheerio.load(await this.buffer());
  }

  get isSecure () {
    return !!this.raw.socket.encrypted;
  }

  async json () {
    return JSON.parse(await this.buffer());
  }

  pipe (writer) {
    const raw = this.raw;
    raw.pipe(writer);
    return new Promise((resolve, reject) => raw.on('error', reject).on('end', resolve));
  }

  async text (charset = 'utf8') {
    return (await this.buffer()).toString(charset);
  }

  async xml () {
    return cheerio.load(await this.buffer(), {xmlMode: true});
  }

  _consumeBody () {
    const chunks = [];
    return new Promise((resolve, reject) => {
      this.raw.on('data', chunk => chunks.push(Buffer.from(chunk)))
        .on('error', reject)
        .on('end', () => resolve(chunks));
    });
  }

  _formIterator (options) {
    // eslint-disable-next-line no-undef
    const ac = new AbortController();

    const raw = this.raw;
    const busboy = new Busboy({headers: raw.headers, ...options});
    busboy.on('field', (fieldname, val) => this._form.append(fieldname, val));
    busboy.on('end', () => ac.abort()).on('finish', () => ac.abort());
    const files = on(busboy, 'file', {signal: ac.signal});
    raw.pipe(busboy);

    return files;
  }

  _isForm () {
    const type = this.raw.headers['content-type'];
    if (type === undefined) return false;
    return type.startsWith('application/x-www-form-urlencoded') || type.startsWith('multipart/form-data');
  }
}
