import cheerio from 'cheerio';
import FormData from './body/form-data.js';
import formidable from 'formidable';

export default class Body {
  constructor (stream) {
    this.raw = stream;
    this._form = undefined;
  }

  async buffer () {
    return Buffer.concat(await this._consumeBody());
  }

  async form () {
    if (this._form === undefined) {
      const type = this.get('Content-Type');
      if (type !== undefined && type.match(/application\/x-www-form-urlencoded/)) {
        this._form = new URLSearchParams(await this.text());
      } else {
        this._form = new URLSearchParams();
      }
    }

    return this._form;
  }

  formData (options) {
    return new Promise((resolve, reject) => {
      formidable(options).parse(this.raw, (error, fields, files) => {
        error == null ? resolve(new FormData(fields, files)) : reject(error);
      });
    });
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
    this.raw.pipe(writer);
    return new Promise((resolve, reject) => {
      this.raw.on('error', err => reject(err));
      this.raw.on('end', () => resolve());
    });
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
      this.raw.on('data', chunk => chunks.push(Buffer.from(chunk)));
      this.raw.on('error', err => reject(err));
      this.raw.on('end', () => resolve(chunks));
    });
  }
}
