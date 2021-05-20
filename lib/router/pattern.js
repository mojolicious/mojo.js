import escapeStringRegexp from 'escape-string-regexp';

const OP = Object.freeze({
  placeholder: Symbol('placeholder'),
  relaxed: Symbol('relaxed'),
  slash: Symbol('slash'),
  text: Symbol('text'),
  wildcard: Symbol('wildcard')
});

export default class Pattern {
  constructor (path, options = {}) {
    this.constraints = options.constraints || {};
    this.defaults = options.defaults || {};
    this.placeholders = [];
    this.regex = undefined;
    this.types = options.types || {};
    this.unparsed = undefined;
    this._ast = [];
    if (path !== undefined) this.parse(path);
  }

  match (path, options) {
    const result = this.matchPartial(path, options);
    if (result === null || (result.remainder.length && result.remainder !== '/')) return null;
    return result.captures;
  }

  matchPartial (path, options) {
    if (this.regex === undefined) this._compile(options.isEndpoint);
    const match = path.match(this.regex);
    if (match === null) return null;
    const prefix = match.shift();

    const captures = {...this.defaults};
    for (const name of [...this.placeholders, 'ext']) {
      if (match.length === 0) break;
      const value = match.shift();
      if (value !== undefined) captures[name] = value;
    }

    return {remainder: path.replace(prefix, ''), captures};
  }

  parse (path = '') {
    this.unparsed = path.replace(/^\/*|\/+/g, '/').replace(/\/$/, '');
    this._tokenize();
    return this;
  }

  render (values, options) {
    let optional = values.ext == null;

    const parts = [];
    for (const token of this._ast) {
      if (token[0] === OP.slash) {
        if (optional === false) parts.unshift('/');
      } else if (token[0] === OP.text) {
        parts.unshift(token[1]);
        optional = false;
      } else {
        const value = this.defaults[token[1]] !== undefined ? this.defaults[token[1]] : '';
        const part = values[token[1]] !== undefined ? values[token[1]] : value;
        if (!value || value !== part) optional = false;
        if (optional === false) parts.unshift(part);
      }
    }

    const path = parts.join('');
    return options.isEndpoint && values.ext ? `${path}.${values.ext}` : path;
  }

  _compile (withExtension) {
    const parts = [];
    let block = '';
    let optional = true;

    for (const token of this._ast) {
      let part = '';
      if (token[0] === OP.slash) {
        parts.unshift(optional ? `(?:/${block})?` : `/${block}`);
        block = '';
        optional = true;
        continue;
      } else if (token[0] === OP.text) {
        part = escapeStringRegexp(token[1]);
        optional = false;
      } else {
        if (token.length > 2) {
          part = this._compileType(this.types[token[2]] ?? '?!');
        } else if (this.constraints[token[1]]) {
          part = this._compileType(this.constraints[token[1]]);
        } else {
          part = token[0] === OP.wildcard ? '(.*)' : token[0] === OP.relaxed ? '([^/]+)' : '([^/.]+)';
        }

        if (this.defaults[token[1]] !== undefined) {
          part = `${part}?`;
        } else {
          optional = false;
        }
      }

      block = part + block;
    }

    if (withExtension === true) {
      parts.push(this._compileExtension(this.constraints.ext, this.defaults.ext !== undefined));
    }
    this.regex = new RegExp('^' + parts.join(''), 's');
  }

  _compileExtension (ext, withDefault) {
    if (ext === undefined) return '';
    const regex = '\\.' + this._compileType(ext);
    return withDefault ? `/?(?:${regex})?$` : `/?${regex}$`;
  }

  _compileType (type) {
    if ((type instanceof RegExp)) return `(${type.source})`;
    if (!(type instanceof Array)) return `(${type})`;
    return '(' + type.slice().sort().reverse().map(val => escapeStringRegexp(val)).join('|') + ')';
  }

  _tokenize () {
    let name = false;
    const ast = this._ast;

    for (const char of this.unparsed) {
      if (char === '<') {
        ast.push([OP.placeholder, '']);
        name = true;
      } else if (char === '>') {
        name = false;
      } else if (name === false && char === ':') {
        if (name === false) ast.push([OP.placeholder, '']);
        name = true;
      } else if (name === false && (char === '#' || char === '*')) {
        if (name === false) ast.push([char === '#' ? OP.relaxed : OP.wildcard, '']);
        name = true;
      } else if (char === '/') {
        ast.push([OP.slash]);
        name = false;
      } else if (name) {
        ast[ast.length - 1][1] = ast[ast.length - 1][1].concat(char);
      } else if (ast[ast.length - 1][0] === OP.text) {
        ast[ast.length - 1][1] = ast[ast.length - 1][1].concat(char);
      } else {
        ast.push([OP.text, char]);
      }
    }

    for (const token of ast) {
      if (token[0] === OP.slash || token[0] === OP.text) continue;
      token[0] = token[1].match(/^#/) ? OP.relaxed : token[1].match(/^\*/) ? OP.wildcard : token[0];
      token.push(...token.pop().replace(/^[:#*]/, '').split(':'));
      this.placeholders.push(token[1]);
    }
    ast.reverse();
  }
}
