'use strict';

const Context = require('../context');
const ServerResponse = require('../server/response');

class HTTPContext extends Context {
  constructor (app, req, res, options) {
    super(app, req, options);
    this.res = new ServerResponse(res, this);
  }

  accepts (allowed) {
    const formats = this.app.mime.detect(this.req.get('Accept') ?? '');
    const stash = this.stash;
    if (typeof stash.ext === 'string') formats.unshift(stash.ext);

    if (allowed === undefined) return formats.length > 0 ? formats : null;

    const results = formats.filter(format => allowed.includes(format));
    return results.length > 0 ? results : null;
  }

  async redirectTo (target, options = {}) {
    await this.res.status(options.status ?? 302).set('Location', this.urlFor(target, options.values)).send();
  }

  async render (options = {}, stash) {
    if (typeof options === 'string') options = {view: options};
    if (stash !== undefined) Object.assign(this.stash, stash);

    const app = this.app;
    const result = await app.renderer.render(this, options);
    if (result === null) {
      if (options.maybe !== true) throw new Error('Nothing could be rendered');
      return false;
    }

    const res = this.res;
    if (res.isSent === true) return false;
    if (options.status !== undefined) res.status(options.status);
    const type = app.mime.extType(result.format) ?? 'application/octet-stream';
    await res.type(type).send(result.output);

    return true;
  }

  async renderToString (options, stash) {
    if (typeof options === 'string') options = {view: options};
    Object.assign(this.stash, stash);
    const result = await this.app.renderer.render(this, options);
    return result === null ? null : result.output.toString();
  }

  async respondTo (spec) {
    const formats = this.accepts() ?? [];

    for (const format of formats) {
      if (spec[format] === undefined) continue;
      await spec[format](this);
      return;
    }

    if (spec.any !== undefined) {
      await spec.any(this);
      return;
    }

    await this.res.status(204).send();
  }

  sendFile (file) {
    return this.app.static.serveFile(this, file);
  }
}

module.exports = HTTPContext;
