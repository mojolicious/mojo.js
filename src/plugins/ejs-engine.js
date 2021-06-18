
import crypto from 'crypto';

import File from '../file.js';

import ejs from 'ejs';

export default function ejsEnginePlugin (app) {
  app.renderer.addEngine('ejs', ejsEngine);
}

async function ejsEngine (ctx, options) {
  let template;

  const renderer = ctx.app.renderer;
  if (options.inline !== undefined) {
    const checksum = crypto.createHash('md5').update(options.inline).digest('hex');
    template = renderer.cache.get(checksum);

    if (template === undefined) {
      template = ejs.compile(options.inline, {async: true});
      renderer.cache.set(checksum, template);
    }
  } else {
    template = renderer.cache.get(options.viewPath);

    if (template === undefined) {
      const source = await new File(options.viewPath).readFile('utf8');
      template = ejs.compile(source, {async: true, filename: options.viewPath});
      renderer.cache.set(options.viewPath, template);
    }
  }

  return Buffer.from(await template({...ctx.stash, stash: ctx.stash, ctx, view: options}));
}
