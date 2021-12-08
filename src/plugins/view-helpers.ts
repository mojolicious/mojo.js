import type {MojoApp, MojoContext, RenderOptions} from '../types.js';
import type {InspectOptions} from 'util';
import {inspect} from 'util';
import DOM, {SafeString} from '@mojojs/dom';

export default function viewHelpersPlugin(app: MojoApp): void {
  app.decorateContext('inspect', (object: Record<string, any>, options: InspectOptions) => inspect(object, options));

  app.addHelper('include', async (ctx: MojoContext, options: RenderOptions, stash: Record<string, any>) => {
    return await ctx.renderToString(options, stash);
  });

  app.addHelper('mojoFaviconTag', mojoFaviconTag);
  app.addHelper('scriptTag', scriptTag);
  app.addHelper('styleTag', styleTag);
  app.addHelper('tag', tag);
}

function mojoFaviconTag(ctx: MojoContext): SafeString {
  const url: string = ctx.urlForFile('/mojo/favicon.ico');
  return ctx.tag('link', {rel: 'icon', href: url});
}

function scriptTag(ctx: MojoContext, target: string): SafeString {
  const url: string = ctx.urlForFile(target);
  return ctx.tag('script', {src: url});
}

function styleTag(ctx: MojoContext, target: string): SafeString {
  const url: string = ctx.urlForFile(target);
  return ctx.tag('link', {rel: 'stylesheet', href: url});
}

function tag(
  ctx: MojoContext,
  name: string,
  attrs: Record<string, string> = {},
  content: string | SafeString = ''
): SafeString {
  return new SafeString(DOM.newTag(name, attrs, content).toString());
}
