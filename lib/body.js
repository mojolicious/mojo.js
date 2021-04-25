'use strict';

export default class Body {
  constructor (stream) {
    this.raw = stream;
  }

  async buffer () {
    return Buffer.concat(await this._consumeBody());
  }

  async json () {
    return JSON.parse(await this.buffer());
  }

  async text (charset = 'utf8') {
    return (await this.buffer()).toString(charset);
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
