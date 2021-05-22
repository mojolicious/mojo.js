import mime from 'mime-types';

const COMMON = {
  html: 'text/html; charset=utf-8',
  json: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8'
};

export default class Mime {
  detect (accepts) {
    const types = {};
    for (const accept of accepts.split(/\s*,\s*/)) {
      const match = accept.match(/^\s*([^,; ]+)(?:\s*;\s*q\s*=\s*(\d+(?:\.\d+)?))?\s*$/i);
      if (match === null) continue;
      types[match[1].toLowerCase()] = parseFloat(match[2] ?? 1);
    }

    const detected = Object.keys(types).sort((a, b) => types[b] - types[a]);
    return detected.map(type => mime.extension(type)).filter(ext => ext !== false);
  }

  extType (ext) {
    return COMMON[ext] ?? mime.types[ext] ?? null;
  }
}
