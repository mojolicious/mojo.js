import type {App} from '../app.js';
import type {MojoContext, RenderOptions} from '../types.js';
import {createHash} from 'crypto';
import {Cache} from '../cache.js';
import {xmlEscape} from '@mojojs/dom';
import Path from '@mojojs/path';
import Template from '@mojojs/template';

/**
 * `@mojojs/template` engine plugin.
 */
export default function mtEnginePlugin(app: App): void {
  app.renderer.addEngine('mt', new MTEngine());
}

class MTEngine {
  cache: Cache<(data?: Record<string, any>) => Promise<string>> = new Cache();

  async render(ctx: MojoContext, options: RenderOptions): Promise<Buffer> {
    let template;

    if (options.inline !== undefined) {
      const checksum = createHash('md5').update(options.inline).digest('hex');
      template = this.cache.get(checksum);

      if (template === undefined) {
        template = new Template(options.inline, {escape: xmlEscape}).compile();
        this.cache.set(checksum, template);
      }
    } else {
      template = this.cache.get(options.viewPath);

      if (template === undefined) {
        if (options.viewPath === undefined) throw new Error('viewPath is not defined for mtEngine');
        const source = await new Path(options.viewPath).readFile('utf8');
        template = new Template(source.toString(), {escape: xmlEscape, name: options.viewPath}).compile();
        this.cache.set(options.viewPath, template);
      }
    }

    return Buffer.from(await template({...ctx.stash, stash: ctx.stash, ctx, view: options}));
  }
}
