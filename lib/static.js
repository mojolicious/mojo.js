import crypto from 'crypto';
import File from './file.js';
import path from 'path';

export default class Static {
  constructor () {
    this.prefix = '/public/';
    this.publicPaths = [File.currentFile().sibling('..', 'vendor', 'public').toString()];
  }

  async dispatch (ctx) {
    const unsafePath = ctx.req.path;
    if (unsafePath === null || unsafePath.startsWith(this.prefix) !== true) return false;

    const relative = unsafePath.replace(this.prefix, '').split('/').join(path.sep);
    if (relative !== path.normalize(relative) || relative.startsWith('..')) return false;

    for (const dir of this.publicPaths) {
      const file = new File(dir, relative);
      if (!await file.isReadable()) continue;
      await this.serveFile(ctx, file);
      return true;
    }

    return false;
  }

  filePath (path) {
    if (path.startsWith('/')) path = path.replace('/', '');
    return this.prefix + path;
  }

  isFresh (ctx, options = {}) {
    if (options.etag !== undefined) ctx.res.set('Etag', `"${options.etag}"`);
    if (options.lastModified !== undefined) ctx.res.set('Last-Modified', options.lastModified.toUTCString());

    // If-None-Match
    const ifNoneMatch = ctx.req.get('If-None-Match');
    if (options.etag !== undefined && ifNoneMatch !== undefined) {
      const etags = ifNoneMatch.split(/,\s+/).map(value => value.replaceAll('"', ''));
      for (const etag of etags) {
        if (etag === options.etag) return true;
      }
    }

    // If-Modified-Since
    const ifModifiedSince = ctx.req.get('If-Modified-Since');
    if (options.lastModified !== undefined && ifModifiedSince !== undefined) {
      const epoch = Date.parse(ifModifiedSince);
      if (isNaN(epoch)) return false;
      if (epoch > options.lastModified.getTime()) return true;
    }

    return false;
  }

  async serveFile (ctx, file) {
    const stat = await file.stat();
    const length = stat.size;
    const type = ctx.app.mime.extType(file.extname()) ?? 'application/octet-stream';
    const range = ctx.req.get('Range');

    // Last-Modified and Etag
    ctx.res.set('Accept-Ranges', 'bytes');
    const mtime = stat.mtime;
    const etag = crypto.createHash('md5').update(mtime.getTime().toString()).digest('hex');
    if (this.isFresh(ctx, {etag, lastModified: mtime})) {
      ctx.res.status(304).send();
      return;
    }

    // Entire file
    if (range === undefined) {
      ctx.res.status(200).set('Content-Length', length).set('Content-Type', type).send(file.createReadStream());
      return;
    }

    // Empty file
    if (length === 0) return this._rangeNotSatisfiable(ctx);

    // Invalid range
    const bytes = range.match(/^bytes=(\d+)?-(\d+)?/);
    if (bytes === null) return this._rangeNotSatisfiable(ctx);
    const start = parseInt(bytes[1]) || 0;
    const end = parseInt(bytes[2]) || (length - 1);
    if (start > end) return this._rangeNotSatisfiable(ctx);

    // Range
    ctx.res.status(200).set('Content-Length', (end - start) + 1).set('Content-Type', type)
      .set('Content-Range', `bytes ${start}-${end}/${length}`)
      .send(file.createReadStream({start: start, end: end}));
  }

  _rangeNotSatisfiable (ctx) {
    ctx.res.status(416).send();
  }
}
