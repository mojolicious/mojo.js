/**
 * HTTP header class.
 */
export class Headers {
  _headers?: Record<string, string[]>;
  _init: string[];
  _normalCase: Record<string, string> = {};

  constructor(init: string[] = []) {
    this._init = init;
  }

  /**
   * Append header value.
   */
  append(name: string, value: string): void {
    const lowerCase = name.toLowerCase();
    const headers = this._getHeaders();
    if (headers[lowerCase] === undefined) return this.set(name, value);

    if (lowerCase === 'set-cookie') {
      headers[lowerCase].push(value);
    } else {
      headers[lowerCase] = [[...headers[lowerCase], value].join(', ')];
    }
  }

  /**
   * Get header value.
   */
  get(name: string): string | null {
    const values = this._getHeaders()[name.toLowerCase()];
    if (values === undefined) return null;
    return values.join(', ');
  }

  /**
   * Get all headers values individually.
   */
  getAll(name: string): string[] {
    const values = this._getHeaders()[name.toLowerCase()] ?? [];
    return [...values];
  }

  /**
   * Set header value.
   */
  set(name: string, value: string): void {
    const lowerCase = name.toLowerCase();
    if (this._normalCase[lowerCase] === undefined) this._normalCase[lowerCase] = name;
    this._getHeaders()[lowerCase] = [value];
  }

  /**
   * Convert headers into a plain array of name/value pairs.
   */
  toArray(): string[] {
    const array = [];

    for (const [name, values] of this._all()) {
      for (const value of values) {
        array.push(name, value);
      }
    }

    return array;
  }

  /**
   * Convert headers into a plain object.
   */
  toObject(): Record<string, string> {
    const object: Record<string, string> = {};
    for (const [name, values] of this._all()) {
      object[name] = values.join(', ');
    }
    return object;
  }

  /**
   * Convert headers to string.
   */
  toString(): string {
    const lines: string[] = [];

    for (const [name, values] of this._all()) {
      for (const value of values) {
        lines.push(`${name}: ${value}\r\n`);
      }
    }

    return lines.join('') + '\r\n';
  }

  _all(): [string, string[]][] {
    const all: [string, string[]][] = [];

    const headers = this._getHeaders();
    const normalCase = this._normalCase;
    for (const [name, values] of Object.entries(headers)) {
      all.push([normalCase[name], values]);
    }

    return all;
  }

  _getHeaders(): Record<string, string[]> {
    if (this._headers === undefined) {
      const headers: Record<string, string[]> = (this._headers = {});
      const normalCase = this._normalCase;
      const init = this._init;
      for (let i = 0; i < init.length; i += 2) {
        const name = init[i];
        const value = init[i + 1];
        const lowerCase = name.toLowerCase();
        normalCase[lowerCase] = name;
        if (headers[lowerCase] === undefined) {
          headers[lowerCase] = [value];
        } else {
          headers[lowerCase].push(value);
        }
      }
    }
    return this._headers;
  }
}
