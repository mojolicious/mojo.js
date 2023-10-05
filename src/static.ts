import type {MojoContext} from './types.js';
import crypto from 'node:crypto';
import Path from '@mojojs/path';

type AssetIndex = Record<string, string>;

/**
 * Static file server class.
 */
export class Static {
  /**
   * Subdirectory used for all static assets.
   */
  assetDir = 'assets';
  /**
   * Prefix to use for all static files.
   */
  prefix = '/static';
  /**
   * Directories to serve static files from, first one has the highest precedence.
   */
  publicPaths = [Path.currentFile().sibling('..', 'vendor', 'public').toString()];

  _assets: AssetIndex | undefined;

  /**
   * Get static asset path.
   */
  assetPath(path: string): string {
    if (path.startsWith('/') === false) path = '/' + path;
    const assets = this._assets;
    if (assets !== undefined && assets[path] !== undefined) return this.prefix + '/' + this.assetDir + assets[path];
    return this.prefix + '/' + this.assetDir + path;
  }

  /**
   * Serve static files.
   */
  async dispatch(ctx: MojoContext): Promise<boolean> {
    const {req} = ctx;
    const unsafePath = req.path;
    if (unsafePath.startsWith(this.prefix) === false) return false;

    const {method} = req;
    if (method !== 'GET' && method !== 'HEAD') return false;

    const relative = new Path(...unsafePath.replace(this.prefix, '').split('/'));
    const relativePath = relative.toString();
    if (relativePath !== relative.normalize().toString() || relativePath.startsWith('..')) return false;

    for (const dir of this.publicPaths) {
      const file = new Path(dir, relativePath);
      if ((await file.isReadable()) !== true || (await file.stat()).isDirectory() === true) continue;

      // Development assets will be rebuilt a lot, do not let browsers cache them
      if (ctx.app.mode === 'development' && relativePath.startsWith(this.assetDir)) {
        ctx.res.set('Cache-Control', 'no-cache');
      }

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
    const {etag, lastModified} = options;

    const {req, res} = ctx;
    if (etag !== undefined) res.set('Etag', `"${etag}"`);
    if (lastModified !== undefined) res.set('Last-Modified', lastModified.toUTCString());

    // If-None-Match
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
    const {app} = ctx;
    if ((await app.hooks.runHook('static:before', ctx, file)) === true) return;

    const stat = await file.stat();
    const length = stat.size;
    if (typeof length !== 'number') return await this._rangeNotSatisfiable(ctx);
    const type = app.mime.extType(file.extname().replace('.', '')) ?? 'application/octet-stream';
    const range = ctx.req.get('Range');

    // Last-Modified and Etag
    const {res} = ctx;
    res.set('Accept-Ranges', 'bytes');
    const lastModified = stat.mtime;
    const etag = crypto.createHash('md5').update(lastModified.getTime().toString()).digest('hex');
    if (this.isFresh(ctx, {etag, lastModified})) {
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
      .status(206)
      .length(end - start + 1)
      .type(type)
      .set('Content-Range', `bytes ${start}-${end}/${length}`)
      .send(file.createReadStream({start, end}));
  }

  /**
   * Prepare static assets.
   */
  async warmup(): Promise<void> {
    const assets: AssetIndex = (this._assets = {});

    const {assetDir} = this;
    for (const publicPath of this.publicPaths) {
      const assetPath = new Path(publicPath, assetDir);
      if ((await assetPath.exists()) === false) continue;

      for await (const assetFile of assetPath.list({recursive: true})) {
        const parts = assetPath.relative(assetFile).toArray();
        const len = parts.length;
        const prefix = len > 1 ? parts.slice(0, len - 1).join('/') : '';

        const match = parts[len - 1].match(/^([^.]+)\.([^.]+)\.(.+)$/);
        if (match === null) continue;

        const name = `${match[1]}.${match[3]}`;
        const short = prefix === '' ? `/${name}` : `/${prefix}/${name}`;
        const long = '/' + parts.join('/');

        if (assets[short] === undefined || match[2] === 'development') assets[short] = long;
      }
    }
  }

  async _rangeNotSatisfiable(ctx: MojoContext): Promise<void> {
    await ctx.res.status(416).send();
  }
}
