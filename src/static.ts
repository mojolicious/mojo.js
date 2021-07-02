import type {MojoContext} from './types.js';
import crypto from 'crypto';
import path from 'path';
import {File} from './file.js';

export class Static {
  prefix = '/public';
  publicPaths = [File.currentFile().sibling('..', 'vendor', 'public').toString()];

  async dispatch (ctx: MojoContext): Promise<boolean> {
    const req = ctx.req;
    const unsafePath = req.path;
    if (unsafePath === null || !unsafePath.startsWith(this.prefix)) return false;

    const method = req.method;
    if (method !== 'GET' && method !== 'HEAD') return false;

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

  filePath (path: string): string {
    if (path.startsWith('/')) path = path.replace('/', '');
    return this.prefix + path;
  }

  isFresh (ctx: MojoContext, options: {etag?: string, lastModified?: Date} = {}): boolean {
    const etag = options.etag;
    const lastModified = options.lastModified;

    const res = ctx.res;
    if (etag !== undefined) res.set('Etag', `"${etag}"`);
    if (lastModified !== undefined) res.set('Last-Modified', lastModified.toUTCString());

    // If-None-Match
    const headers = ctx.req.headers;
    const ifNoneMatch = headers['if-none-match'];
    if (etag !== undefined && ifNoneMatch !== undefined) {
      const etags = ifNoneMatch.split(/,\s+/).map(value => value.replaceAll('"', ''));
      for (const match of etags) {
        if (match === etag) return true;
      }
    }

    // If-Modified-Since
    const ifModifiedSince = headers['if-modified-since'];
    if (options.lastModified !== undefined && ifModifiedSince !== undefined) {
      const epoch = Date.parse(ifModifiedSince);
      if (isNaN(epoch)) return false;
      if (epoch > options.lastModified.getTime()) return true;
    }

    return false;
  }

  async serveFile (ctx: MojoContext, file: File): Promise<void> {
    const app = ctx.app;
    if (await app.hooks.runHook('static', ctx, file) === true) return;

    const stat = await file.stat();
    const length = stat.size;
    if (typeof length !== 'number') return await this._rangeNotSatisfiable(ctx);
    const type = app.mime.extType(file.extname().replace('.', '')) ?? 'application/octet-stream';
    const range = ctx.req.headers.range;

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
    if (range === undefined) {
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
    await res.status(200).length((end - start) + 1).type(type).set('Content-Range', `bytes ${start}-${end}/${length}`)
      .send(file.createReadStream({start: start, end: end}));
  }

  async _rangeNotSatisfiable (ctx: MojoContext): Promise<void> {
    await ctx.res.status(416).send();
  }
}
