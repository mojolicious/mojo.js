import ejs from 'ejs';
import File from '../file.js';

export default function ejsEnginePlugin (app) {
  app.renderer.addEngine('ejs', ejsEngine);
}

async function ejsEngine (ctx, options) {
  let template;

  if (options.inline !== undefined) {
    template = ejs.compile(options.inline);
  } else {
    template = ctx.app.renderer.cache.get(options.viewPath);

    if (template === undefined) {
      const source = await new File(options.viewPath).readFile('utf8');
      template = ejs.compile(source, {filename: options.viewPath});
      ctx.app.renderer.cache.set(options.viewPath, template);
    }
  }

  return Buffer.from(template({...ctx.stash, ctx: ctx, helpers: ctx.helpers}));
}
