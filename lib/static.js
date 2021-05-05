import File from './file.js';

export default class Static {
  constructor () {
    this.prefix = '/public/';
    this.publicPaths = [];
  }

  async dispatch (ctx) {
    const path = ctx.req.path;
    if (path === null || !path.startsWith(this.prefix)) return false;

    const parts = path.replace(this.prefix, '').split('/');
    for (const dir of this.publicPaths) {
      const file = new File(dir, ...parts);
      if (!await file.isReadable()) continue;
      this.serveFile(ctx, file);
      return true;
    }

    return false;
  }

  async serveFile (ctx, file) {
    const length = (await file.stat()).size;
    const type = ctx.app.mime.extType(file.extname()) ?? 'application/octet-stream';
    ctx.res.raw.writeHead(200, {'Content-Length': length, 'Content-Type': type});
    file.createReadStream().pipe(ctx.res.raw);
  }
}
