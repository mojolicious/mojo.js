import mime from 'mime-types';

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
    const type = mime.types[ext];
    if (type === undefined) return null;
    return type.startsWith('text/') || type === 'application/json' ? `${type}; charset=utf-8` : type;
  }
}
