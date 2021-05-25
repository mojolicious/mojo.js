import cheerio from 'cheerio';
import File from './file.js';
import os from 'os';
import Params from './body/params.js';
import formidable from 'formidable';

const MAX_FILE_SIZE = 200 * 1024 * 1024;
const TMP_DIR = os.tmpdir();

export default class Body {
  constructor (stream) {
    this.maxFileSize = MAX_FILE_SIZE;
    this.raw = stream;
    this.tmpdir = TMP_DIR;
    this._files = undefined;
    this._form = undefined;
    this._formData = undefined;
    this._isForm = undefined;
    this._isFormData = undefined;
  }

  async buffer () {
    return Buffer.concat(await this._consumeBody());
  }

  async files () {
    if (this._formData === undefined) await this._loadformData();
    return this._files;
  }

  async form () {
    if (this._form === undefined) this._form = this.isForm === true ? new Params(await this.text()) : new Params();
    return this._form;
  }

  async formData () {
    if (this._formData === undefined) await this._loadformData();
    return this._formData;
  }

  get (name) {
    return this.raw.headers[name.toLowerCase()];
  }

  async html () {
    return cheerio.load(await this.buffer());
  }

  get isForm () {
    if (this._isForm === undefined) {
      const type = this.raw.headers['content-type'];
      this._isForm = type !== undefined && type.startsWith('application/x-www-form-urlencoded') === true;
    }
    return this._isForm;
  }

  get isFormData () {
    if (this._isFormData === undefined) {
      const type = this.raw.headers['content-type'];
      this._isFormData = type !== undefined && type.startsWith('multipart/form-data') === true;
    }
    return this._isFormData;
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

  async _loadformData () {
    this._formData = new Params();
    this._files = {};

    if (this.isFormData === false) return;

    await new Promise((resolve, reject) => {
      formidable({maxFileSize: this.maxFileSize, uploadDir: this.tmpdir}).parse(this.raw, (error, fields, files) => {
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
