import File from './file.js';

export default class Static {
  constructor () {
    this.prefix = '/public/';
    this.publicPaths = [File.currentFile().sibling('..', 'vendor', 'public').toString()];
  }

  async dispatch (ctx) {
    const path = ctx.req.path;
    if (path === null || !path.startsWith(this.prefix)) return false;
    const parts = path.replace(this.prefix, '').split('/');

    for (const dir of this.publicPaths) {
      const file = new File(dir, ...parts);
      if (!await file.isReadable()) continue;
      await this.serveFile(ctx, file.toString());
      return true;
    }

    return false;
  }

  filePath (path) {
    if (path.startsWith('/')) path = path.replace('/', '');
    return this.prefix + path;
  }

  async serveFile (ctx, path) {
    const file = new File(path);
    const length = (await file.stat()).size;
    const type = ctx.app.mime.extType(file.extname()) ?? 'application/octet-stream';
    const range = ctx.req.get('Range');

    // Entire file
    if (range === undefined) {
      ctx.res.status(200).set('Content-Length', length).set('Content-Type', type).send(file.createReadStream());
      return;
    }

    // Empty file
    if (length === 0) {
      ctx.res.status(416).send();
      return;
    }

    // Invalid range
    const bytes = range.match(/^bytes=(\d+)?-(\d+)?/);
    if (bytes === null) {
      ctx.res.status(416).send();
      return;
    }
    const start = parseInt(bytes[1]) || 0;
    const end = parseInt(bytes[2]) || (length - 1);
    if (start > end) {
      ctx.res.status(416).send();
      return;
    }

    // Range
    ctx.res.status(200).set('Content-Length', (end - start) + 1).set('Content-Type', type)
      .set('Content-Range', `bytes ${start}-${end}/${length}`)
      .send(file.createReadStream({start: start, end: end}));
  }
}
