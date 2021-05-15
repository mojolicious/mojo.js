import File from './file.js';

export default class Mime {
  constructor () {
    this.types = {};
    this._reverse = undefined;

    const mime = JSON.parse(File.currentFile().sibling('mime.json').readFileSync());
    for (const [type, data] of Object.entries(mime)) {
      for (const ext of data.extensions) {
        if (this.types[ext] === undefined) this.types[ext] = [];
        this.types[ext].push(data.charset ? `${type};charset=${data.charset}` : type);
      }
    }
  }

  detect (accepts) {
    if (this._reverse === undefined) {
      this._reverse = {};
      for (const ext of Object.keys(this.types).sort()) {
        for (const type of this.types[ext].map(type => type.replace(/;.*$/, '').toLowerCase())) {
          if (this._reverse[type] === undefined) this._reverse[type] = [];
          this._reverse[type].push(ext);
        }
      }
    }

    // Prioritize MIME types
    const types = {};
    for (const accept of accepts.split(/\s*,\s*/)) {
      const match = accept.match(/^\s*([^,; ]+)(?:\s*;\s*q\s*=\s*(\d+(?:\.\d+)?))?\s*$/i);
      if (match === null) continue;
      types[match[1].toLowerCase()] = parseFloat(match[2] ?? 1);
    }
    const detected = Object.keys(types).sort((a, b) => types[b] - types[a]);

    return detected.map(ext => this._reverse[ext]).flat().filter(ext => ext !== undefined);
  }

  extType (ext) {
    return this.types[ext.replace(/^\./, '')]?.[0] ?? null;
  }
}
