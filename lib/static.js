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
      this.serveFile(ctx, file.toString());
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
    ctx.res.writeHead(200, {'Content-Length': length, 'Content-Type': type});
    file.createReadStream().pipe(ctx.res.raw);
  }
}
