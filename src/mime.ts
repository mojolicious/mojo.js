import mime from 'mime-types';

/**
 * MIME class.
 */
export class Mime {
  /**
   * Custom MIME types.
   */
  custom: Record<string, string> = {
    html: 'text/html; charset=utf-8',
    json: 'application/json; charset=utf-8',
    txt: 'text/plain; charset=utf-8',
    yaml: 'text/yaml; charset=utf-8'
  };

  _reverseCustom: Record<string, string> | undefined = undefined;

  /**
   * Detect file extensions from `Accept` header value.
   */
  detect(accepts: string): string[] {
    if (this._reverseCustom === undefined) {
      this._reverseCustom = {};
      for (const [name, value] of Object.entries(this.custom)) {
        const match = value.match(/^\s*([^,; ]+)/);
        if (match !== null) this._reverseCustom[match[1]] = name;
      }
    }
    const reverse = this._reverseCustom;

    const types: Record<string, number> = {};
    for (const accept of accepts.split(/\s*,\s*/)) {
      const match = accept.match(/^\s*([^,; ]+)(?:\s*;\s*q\s*=\s*(\d+(?:\.\d+)?))?\s*$/i);
      if (match === null) continue;
      types[match[1].toLowerCase()] = parseFloat(match[2] ?? 1);
    }

    const exts: string[] = [];
    for (const type of Object.keys(types).sort((a, b) => types[b] - types[a])) {
      const ext = reverse[type] ?? mime.extension(type);
      if (typeof ext === 'string') exts.push(ext);
    }
    return exts;
  }

  /**
   * Get MIME type for file extension.
   */
  extType(ext: string): string | null {
    return this.custom[ext] ?? mime.types[ext] ?? null;
  }
}
