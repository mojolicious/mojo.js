import type {PlaceholderType} from '../types.js';
import {escapeRegExp} from '@mojojs/util';

interface MatchOptions {
  isEndpoint: boolean;
}
type PlaceholderTypes = Record<string, PlaceholderType>;

type ASTNode = [symbol, ...string[]];

const OP = {
  placeholder: Symbol('placeholder'),
  relaxed: Symbol('relaxed'),
  slash: Symbol('slash'),
  text: Symbol('text'),
  wildcard: Symbol('wildcard')
};

/**
 * Route pattern class.
 */
export class Pattern {
  /**
   * Pattern constraints.
   */
  constraints: PlaceholderTypes;
  /**
   * Pattern default values.
   */
  defaults: Record<string, any>;
  /**
   * Placeholder names.
   */
  placeholders: string[] = [];
  /**
   * Pattern in compiled regular expression form.
   */
  regex: RegExp | undefined = undefined;
  /**
   * Placeholder types.
   */
  types: PlaceholderTypes;
  /**
   * Raw unparsed pattern.
   */
  unparsed = '';

  _ast: ASTNode[] = [];

  constructor(
    path?: string,
    options: {constraints?: PlaceholderTypes; defaults?: Record<string, any>; types?: PlaceholderTypes} = {}
  ) {
    this.constraints = options.constraints ?? {};
    this.defaults = options.defaults ?? {};
    this.types = options.types ?? {};

    if (path !== undefined) this.parse(path);
  }

  /**
   * Match pattern against entire path.
   */
  match(path: string, options: MatchOptions): Record<string, any> | null {
    const result = this.matchPartial(path, options);
    if (result === null || (result.remainder.length > 0 && result.remainder !== '/')) return null;
    return result.captures;
  }

  /**
   * Match pattern against path and return the remainder.
   */
  matchPartial(path: string, options: MatchOptions): (Record<string, any> & {remainder: string}) | null {
    if (this.regex === undefined) this.regex = this._compile(options.isEndpoint);
    const match = path.match(this.regex);
    if (match === null) return null;
    const prefix = match.shift() ?? '';

    const captures = {...this.defaults};
    for (const name of [...this.placeholders, 'ext']) {
      if (match.length === 0) break;
      const value = match.shift();
      if (value !== undefined) captures[name] = value;
    }

    return {remainder: path.replace(prefix, ''), captures};
  }

  /**
   * Parse pattern.
   */
  parse(path = ''): this {
    this.unparsed = path.replace(/^\/*|\/+/g, '/').replace(/\/$/, '');
    this._tokenize();
    return this;
  }

  /**
   * Render pattern into a path with parameters.
   */
  render(values: Record<string, string>, options: MatchOptions): string {
    let optional = values.ext == null;

    const parts: string[] = [];
    for (const token of this._ast) {
      if (token[0] === OP.slash) {
        if (optional === false) parts.unshift('/');
      } else if (token[0] === OP.text) {
        parts.unshift(token[1]);
        optional = false;
      } else {
        const defaults = this.defaults;
        const hasDefault = defaults[token[1]] !== undefined;
        const value = hasDefault ? defaults[token[1]] : null;
        const part = values[token[1]] !== undefined ? values[token[1]] : value;

        if (hasDefault === false || value !== part) optional = false;
        if (optional === false) parts.unshift(part);
      }
    }

    const path = parts.join('');
    return options.isEndpoint && values.ext != null ? `${path}.${values.ext}` : path;
  }

  _compile(withExtension: boolean): RegExp {
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
        part = escapeRegExp(token[1]);
        optional = false;
      } else {
        if (token.length > 2) {
          part = this._compileType(this.types[token[2]] ?? '?!');
        } else if (this.constraints[token[1]] != null) {
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

    if (withExtension) {
      parts.push(this._compileExtension(this.constraints.ext, this.defaults.ext !== undefined));
    }

    return new RegExp('^' + parts.join(''), 's');
  }

  _compileExtension(ext: PlaceholderType, withDefault: boolean): string {
    if (ext === undefined) return '';
    const regex = '\\.' + this._compileType(ext);
    return withDefault ? `/?(?:${regex})?$` : `/?${regex}$`;
  }

  _compileType(type: PlaceholderType): string {
    if (type instanceof RegExp) return `(${type.source})`;
    if (!Array.isArray(type)) return `(${type})`;
    return (
      '(' +
      type
        .slice()
        .sort()
        .reverse()
        .map(val => escapeRegExp(val))
        .join('|') +
      ')'
    );
  }

  _tokenize(): void {
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
      } else if (name === true) {
        ast[ast.length - 1][1] = ast[ast.length - 1][1].concat(char);
      } else if (ast[ast.length - 1][0] === OP.text) {
        ast[ast.length - 1][1] = ast[ast.length - 1][1].concat(char);
      } else {
        ast.push([OP.text, char]);
      }
    }

    for (const token of ast) {
      if (token[0] === OP.slash || token[0] === OP.text) continue;
      token[0] = /^#/.test(token[1]) ? OP.relaxed : /^\*/.test(token[1]) ? OP.wildcard : token[0];
      const typed = token.pop() as string;
      token.push(...typed.replace(/^[:#*]/, '').split(':'));
      this.placeholders.push(token[1]);
    }
    ast.reverse();
  }
}
