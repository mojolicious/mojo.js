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

      ctx.res.status = 200;
      ctx.res.set('Content-Length', (await file.stat()).size);
      ctx.res.set('Content-Type', ctx.app.mime.extType(file.extname()) ?? 'application/octet-stream');
      ctx.res.body(file.createReadStream());
      return true;
    }

    return false;
  }
}
