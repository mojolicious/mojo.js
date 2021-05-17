import crypto from 'crypto';
import ejs from 'ejs';
import File from '../file.js';

export default function ejsEnginePlugin (app) {
  app.renderer.addEngine('ejs', ejsEngine);
}

async function ejsEngine (ctx, options) {
  let template;

  if (options.inline !== undefined) {
    const checksum = crypto.createHash('md5').update(options.inline).digest('hex');
    template = ctx.app.renderer.cache.get(checksum);

    if (template === undefined) {
      template = ejs.compile(options.inline, {async: true});
      ctx.app.renderer.cache.set(checksum, template);
    }
  } else {
    template = ctx.app.renderer.cache.get(options.viewPath);

    if (template === undefined) {
      const source = await new File(options.viewPath).readFile('utf8');
      template = ejs.compile(source, {async: true, filename: options.viewPath});
      ctx.app.renderer.cache.set(options.viewPath, template);
    }
  }

  return Buffer.from(await template({...ctx.stash, ctx, view: options}));
}
