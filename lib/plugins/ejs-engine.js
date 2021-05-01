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
    template = ctx.app.renderer.cache.get(options.templatePath);

    if (template === undefined) {
      const source = await new File(options.templatePath).readFile('utf8');
      template = ejs.compile(source, {filename: options.templatePath});
      ctx.app.renderer.cache.set(options.templatePath, template);
    }
  }

  return Buffer.from(template({...ctx.stash, ctx: ctx, helpers: ctx.helpers}));
}
