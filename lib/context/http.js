import Context from '../context.js';
import ServerResponse from '../server/response.js';

export default class HTTPContext extends Context {
  constructor (app, req, res) {
    super(app, req);
    this.res = new ServerResponse(res);
  }

  async render (values) {
    Object.assign(this.stash, values);

    const result = await this.app.renderer.render(this).catch(error => this.helpers.exception(error));
    if (result === null) throw new Error('Nothing could be rendered!');

    this.res.headers['Content-Length'] = Buffer.byteLength(result.output);
    this.res.headers['Content-Type'] = this.app.mime.extType(result.format) ?? 'application/octet-stream';

    this.res.raw.writeHead(this.stash.status || 200, this.res.headers);
    this.res.raw.end(result.output);
  }
}
