import type {App} from '../app.js';
import type {MojoContext, MojoRenderOptions} from '../types.js';
import type {AsyncTemplateFunction} from 'ejs';
import {createHash} from 'crypto';
import {File} from '../file.js';
import {compile} from 'ejs';

export default function ejsEnginePlugin (app: App): void {
  app.renderer.addEngine('ejs', ejsEngine);
}

async function ejsEngine (ctx: MojoContext, options: MojoRenderOptions): Promise<Buffer> {
  let template: AsyncTemplateFunction;

  const renderer = ctx.app.renderer;
  if (options.inline !== undefined) {
    const checksum = createHash('md5').update(options.inline).digest('hex');
    template = renderer.cache.get(checksum);

    if (template === undefined) {
      template = compile(options.inline, {async: true});
      renderer.cache.set(checksum, template);
    }
  } else {
    template = renderer.cache.get(options.viewPath);

    if (template === undefined) {
      if (options.viewPath === undefined) throw new Error('viewPath is not defined for ejsEngine');
      const source = await new File(options.viewPath).readFile('utf8');
      template = compile(source.toString(), {async: true, filename: options.viewPath});
      renderer.cache.set(options.viewPath, template);
    }
  }

  return Buffer.from(await template({...ctx.stash, stash: ctx.stash, ctx, view: options}));
}
