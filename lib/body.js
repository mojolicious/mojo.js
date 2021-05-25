import Busboy from 'busboy';
import cheerio from 'cheerio';
import EventEmitter from 'events';
import Params from './body/params.js';

export default class Body extends EventEmitter {
  constructor (stream) {
    super();
    this.raw = stream;
    this._form = undefined;
  }

  async buffer () {
    return Buffer.concat(await this._consumeBody());
  }

  async form (options) {
    if (this._form === undefined) await this._loadForm(options);
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

  async _loadForm (options) {
    this._form = new Params();

    const type = this.raw.headers['content-type'];
    if (type === undefined) return;
    const isForm = type.startsWith('application/x-www-form-urlencoded');
    const isFormData = type.startsWith('multipart/form-data');
    if (!isForm && !isFormData) return;

    const busboy = new Busboy({...options, headers: this.raw.headers});
    await new Promise((resolve, reject) => {
      busboy.on('field', (fieldname, val) => this._form.append(fieldname, val));
      busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        this.emit('file', fieldname, file, filename, encoding, mimetype);
      });

      busboy.on('end', resolve);
      busboy.on('finish', resolve);
      busboy.on('error', reject);

      this.raw.pipe(busboy);
    });
  }
}
