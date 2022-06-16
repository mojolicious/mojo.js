import type {MojoContext} from './types.js';
import crypto from 'crypto';
import Path from '@mojojs/path';

/**
 * Static file server class.
 */
export class Static {
  /**
   * Prefix to use for all static files.
   */
  prefix = '/static';
  /**
   * Directories to serve static files from, first one has the highest precedence.
   */
  publicPaths = [Path.currentFile().sibling('..', 'vendor', 'public').toString()];

  /**
   * Serve static files.
   */
  async dispatch(ctx: MojoContext): Promise<boolean> {
    const req = ctx.req;
    const unsafePath = req.path;
    if (unsafePath === null || !unsafePath.startsWith(this.prefix)) return false;

    const method = req.method;
    if (method !== 'GET' && method !== 'HEAD') return false;

    const relative = new Path(...unsafePath.replace(this.prefix, '').split('/'));
    const relativePath = relative.toString();
    if (relativePath !== relative.normalize().toString() || relativePath.startsWith('..')) return false;

    for (const dir of this.publicPaths) {
      const file = new Path(dir, relativePath);
      if ((await file.isReadable()) !== true || (await file.stat()).isDirectory() === true) continue;
      await this.serveFile(ctx, file);
      return true;
    }

    return false;
  }

  /**
   * Get static file path with prefix.
   */
  filePath(path: string): string {
    if (path.startsWith('/') === false) path = '/' + path;
    return this.prefix + path;
  }

  /**
   * Check freshness of request by comparing the `If-None-Match` and `If-Modified-Since` request headers to the `ETag`
   * and `Last-Modified` response headers.
   */
  isFresh(ctx: MojoContext, options: {etag?: string; lastModified?: Date} = {}): boolean {
    const etag = options.etag;
    const lastModified = options.lastModified;

    const res = ctx.res;
    if (etag !== undefined) res.set('Etag', `"${etag}"`);
    if (lastModified !== undefined) res.set('Last-Modified', lastModified.toUTCString());

    // If-None-Match
    const req = ctx.req;
    const ifNoneMatch = req.get('If-None-Match');
    if (etag !== undefined && ifNoneMatch !== null) {
      const etags = ifNoneMatch.split(/,\s+/).map(value => value.replaceAll('"', ''));
      for (const match of etags) {
        if (match === etag) return true;
      }
    }

    // If-Modified-Since
    const ifModifiedSince = req.get('If-Modified-Since');
    if (options.lastModified !== undefined && ifModifiedSince !== null) {
      const epoch = Date.parse(ifModifiedSince);
      if (isNaN(epoch)) return false;
      if (epoch > options.lastModified.getTime()) return true;
    }

    return false;
  }

  /**
   * Serve a specific file.
   */
  async serveFile(ctx: MojoContext, file: Path): Promise<void> {
    const app = ctx.app;
    if ((await app.hooks.runHook('static:before', ctx, file)) === true) return;

    const stat = await file.stat();
    const length = stat.size;
    if (typeof length !== 'number') return await this._rangeNotSatisfiable(ctx);
    const type = app.mime.extType(file.extname().replace('.', '')) ?? 'application/octet-stream';
    const range = ctx.req.get('Range');

    // Last-Modified and Etag
    const res = ctx.res;
    res.set('Accept-Ranges', 'bytes');
    const mtime = stat.mtime;
    const etag = crypto.createHash('md5').update(mtime.getTime().toString()).digest('hex');
    if (this.isFresh(ctx, {etag, lastModified: mtime})) {
      await res.status(304).send();
      return;
    }

    // Entire file
    if (range === null) {
      await res.status(200).length(length).type(type).send(file.createReadStream());
      return;
    }

    // Empty file
    if (length === 0) return await this._rangeNotSatisfiable(ctx);

    // Invalid range
    const bytes = range.match(/^bytes=(\d+)?-(\d+)?/);
    if (bytes === null) return await this._rangeNotSatisfiable(ctx);
    let start = parseInt(bytes[1]);
    if (isNaN(start)) start = 0;
    let end = parseInt(bytes[2]);
    if (isNaN(end)) end = length - 1;
    if (start > end) return await this._rangeNotSatisfiable(ctx);

    // Range
    await res
      .status(200)
      .length(end - start + 1)
      .type(type)
      .set('Content-Range', `bytes ${start}-${end}/${length}`)
      .send(file.createReadStream({start: start, end: end}));
  }

  async _rangeNotSatisfiable(ctx: MojoContext): Promise<void> {
    await ctx.res.status(416).send();
  }
}
