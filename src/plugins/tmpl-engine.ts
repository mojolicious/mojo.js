import type {App} from '../app.js';
import type {MojoContext, MojoRenderOptions} from '../types.js';
import {createHash} from 'node:crypto';
import {Cache} from '../cache.js';
import Path from '@mojojs/path';
import Template from '@mojojs/template';

/**
 * `@mojojs/template` engine plugin.
 */
export default function tmplEnginePlugin(app: App): void {
  app.renderer.addEngine('tmpl', new TmplEngine());
}

class TmplEngine {
  cache = new Cache<(data?: Record<string, any>) => Promise<string>>();

  async render(ctx: MojoContext, options: MojoRenderOptions): Promise<Buffer> {
    let template;

    if (options.inline !== undefined) {
      const checksum = createHash('md5').update(options.inline).digest('hex');
      template = this.cache.get(checksum);

      if (template === undefined) {
        template = new Template(options.inline).compile();
        this.cache.set(checksum, template);
      }
    } else {
      template = this.cache.get(options.viewPath);

      if (template === undefined) {
        if (options.viewPath === undefined) throw new Error('viewPath is not defined for tmplEngine');
        const source = await new Path(options.viewPath).readFile('utf8');
        template = new Template(source.toString(), {name: options.viewPath}).compile();
        this.cache.set(options.viewPath, template);
      }
    }

    return Buffer.from(await template({...ctx.stash, stash: ctx.stash, ctx, view: options, tags: ctx.tags}));
  }
}
