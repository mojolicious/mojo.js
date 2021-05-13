import Context from '../context.js';
import File from '../file.js';
import ServerResponse from '../server/response.js';

export default class HTTPContext extends Context {
  constructor (app, req, res) {
    super(app, req);
    this.res = new ServerResponse(res);
  }

  redirectTo (target, options = {}) {
    this.res.status(options.status ?? 302).set('Location', this.urlFor(target, options.values)).send();
  }

  async render (options, stash) {
    if (typeof options === 'string') options = {view: options};
    if (stash !== undefined) Object.assign(this.stash, stash);

    const result = await this.app.renderer.render(this, options).catch(error => this.exception(error));
    if (this.res.raw.writableEnded || result === undefined) return false;
    if (result === null) {
      if (options.maybe !== true) throw new Error('Nothing could be rendered');
      return false;
    }

    const type = this.app.mime.extType(result.format) ?? 'application/octet-stream';
    this.res.status(options.status ?? 200).set('Content-Type', type).send(result.output);
    return true;
  }

  async renderToString (options, stash) {
    if (typeof options === 'string') options = {view: options};
    Object.assign(this.stash, stash);
    const result = await this.app.renderer.render(this, options);
    return result === null ? null : result.output.toString();
  }

  sendFile (path) {
    return this.app.static.serveFile(this, new File(path));
  }
}
