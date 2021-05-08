import {currentFile} from './file.js';

export default class Mime {
  constructor () {
    this.types = {};
    const mime = JSON.parse(currentFile().sibling('mime.json').readFileSync());
    for (const [type, data] of Object.entries(mime)) {
      for (const ext of data.extensions) {
        if (this.types[ext] === undefined) this.types[ext] = [];
        this.types[ext].push(data.charset ? `${type};charset=${data.charset}` : type);
      }
    }
  }

  extType (ext) {
    return this.types[ext.replace(/^\./, '')]?.[0] ?? null;
  }
}
