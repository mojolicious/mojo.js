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

      ctx.res.headers['Content-Length'] = (await file.stat()).size;
      ctx.res.headers['Content-Type'] = ctx.app.mime.extType(file.extname()) ?? 'application/octet-stream';
      ctx.res.raw.writeHead(200, ctx.res.headers);
      file.createReadStream().pipe(ctx.res.raw);
      return true;
    }

    return false;
  }
}
