import type App from '../app.js';
import type File from '../file.js';
import type {MojoAction, MojoRenderOptions, MojoStash, ServerRequestOptions} from '../types.js';
import type http from 'http';
import Context from '../context.js';
import ServerResponse from '../server/response.js';

export default class HTTPContext extends Context {
  res: ServerResponse;

  constructor (app: App, req: http.IncomingMessage, res: http.ServerResponse, options: ServerRequestOptions) {
    super(app, req, options);
    this.res = new ServerResponse(res, this);
  }

  accepts (allowed?: string[]): string[] | null {
    const formats = this.app.mime.detect(this.req.headers.accept ?? '');
    const stash = this.stash;
    if (typeof stash.ext === 'string') formats.unshift(stash.ext);

    if (allowed === undefined) return formats.length > 0 ? formats : null;

    const results = formats.filter(format => allowed.includes(format));
    return results.length > 0 ? results : null;
  }

  async redirectTo (target: string, options: {status?: number, values?: MojoStash} = {}): Promise<void> {
    await this.res.status(options.status ?? 302).set('Location', this.urlFor(target, options.values) ?? '').send();
  }

  async render (options: MojoRenderOptions = {}, stash?: MojoStash): Promise<boolean> {
    if (typeof options === 'string') options = {view: options};
    if (stash !== undefined) Object.assign(this.stash, stash);

    const app = this.app;
    const result = await app.renderer.render(this, options);
    if (result === null) {
      if (options.maybe !== true) throw new Error('Nothing could be rendered');
      return false;
    }

    const res = this.res;
    if (res.isSent) return false;
    if (options.status !== undefined) res.status(options.status);
    const type = app.mime.extType(result.format) ?? 'application/octet-stream';
    await res.type(type).send(result.output);

    return true;
  }

  async renderToString (options: MojoRenderOptions, stash?: MojoStash): Promise<string | null> {
    if (typeof options === 'string') options = {view: options};
    Object.assign(this.stash, stash);
    const result = await this.app.renderer.render(this, options);
    return result === null ? null : result.output.toString();
  }

  async respondTo (spec: Record<string, MojoAction>): Promise<void> {
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

  async sendFile (file: File): Promise<void> {
    return await this.app.static.serveFile(this, file);
  }
}
