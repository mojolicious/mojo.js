import cheerio from 'cheerio';
import File from './file.js';
import Params from './body/params.js';
import formidable from 'formidable';

export default class Body {
  constructor (stream) {
    this.raw = stream;
    this._files = undefined;
    this._form = undefined;
    this._formData = undefined;
  }

  async buffer () {
    return Buffer.concat(await this._consumeBody());
  }

  async files (options) {
    if (this._formData === undefined) await this._loadformData(options);
    return this._files;
  }

  async form () {
    if (this._form === undefined) {
      this._form = new Params();
      const type = this.get('Content-Type');
      if (type !== undefined && type.startsWith('application/x-www-form-urlencoded') === true) {
        this._form = new Params(await this.text());
      }
    }

    return this._form;
  }

  async formData (options) {
    if (this._formData === undefined) await this._loadformData(options);
    return this._formData;
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

  async _loadformData (options) {
    this._formData = new Params();
    this._files = {};

    const type = this.get('Content-Type');
    if (type === undefined || type.startsWith('multipart/form-data') === false) return;

    await new Promise((resolve, reject) => {
      formidable(options).parse(this.raw, (error, fields, files) => {
        if (error != null) {
          reject(error);
          return;
        }
        this._mergeFormData(fields, files);
        resolve();
      });
    });
  }

  _mergeFormData (fields, files) {
    this._formData = new Params(fields);
    for (const [name, value] of Object.entries(files)) {
      this._files[name] = {file: new File(value.path), filename: value.name, type: value.type, size: value.size};
    }
  }
}
