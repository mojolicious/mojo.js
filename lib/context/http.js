import Context from '../context.js';
import ServerResponse from '../server/response.js';

export default class HTTPContext extends Context {
  constructor (app, req, res) {
    super(app, req);
    this.res = new ServerResponse(res);
  }

  redirectTo (target, options = {}) {
    this.res.writeHead(options.status ?? 302, {Location: this.urlFor(target, options.values)});
    this.res.end();
  }

  async render (options, stash) {
    if (typeof options === 'string') options = {view: options};
    Object.assign(this.stash, stash);

    const result = await this.app.renderer.render(this, options).catch(error => this.exception(error));
    if (this.res.raw.writableEnded || result === undefined) return false;
    if (result === null) {
      if (options.maybe !== true) throw new Error('Nothing could be rendered');
      return false;
    }

    const length = Buffer.byteLength(result.output);
    const type = this.app.mime.extType(result.format) ?? 'application/octet-stream';
    this.res.writeHead(options.status ?? 200, {'Content-Length': length, 'Content-Type': type});
    this.res.end(result.output);
    return true;
  }

  async renderToString (options, stash) {
    if (typeof options === 'string') options = {view: options};
    Object.assign(this.stash, stash);
    const result = await this.app.renderer.render(this, options);
    return result === null ? null : result.output.toString();
  }

  sendFile (path) {
    return this.app.static.serveFile(this, path);
  }
}
