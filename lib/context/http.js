import Context from '../context.js';
import ServerResponse from '../server/response.js';

export default class HTTPContext extends Context {
  constructor (app, req, res, options) {
    super(app, req, options);
    this.res = new ServerResponse(res);
  }

  redirectTo (target, options = {}) {
    this.res.status(options.status ?? 302).set('Location', this.urlFor(target, options.values)).send();
  }

  async render (options = {}, stash) {
    if (typeof options === 'string') options = {view: options};
    if (stash !== undefined) Object.assign(this.stash, stash);

    const result = await this.app.renderer.render(this, options);
    if (result === null) {
      if (options.maybe !== true) throw new Error('Nothing could be rendered');
      return false;
    }

    if (this.res.isSent === true) return false;
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

  async respondTo (spec) {
    const formats = this.app.mime.detect(this.req.get('Accept') ?? '');
    if (typeof this.stash.ext === 'string') formats.unshift(this.stash.ext);

    for (const format of formats) {
      if (spec[format] === undefined) continue;
      await spec[format](this);
      return;
    }

    if (spec.any !== undefined) {
      await spec.any(this);
      return;
    }

    this.res.status(204).send();
  }

  sendFile (file) {
    return this.app.static.serveFile(this, file);
  }
}
