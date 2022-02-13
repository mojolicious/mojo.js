import type {MojoApp, MojoContext, RenderOptions} from '../types.js';
import DOM from '@mojojs/dom';
import {SafeString} from '@mojojs/template';

/**
 * View helper plugin.
 */
export default function viewHelpersPlugin(app: MojoApp): void {
  app.addHelper('include', include);

  app.addHelper('mojoFaviconTag', mojoFaviconTag);
  app.addHelper('scriptTag', scriptTag);
  app.addHelper('styleTag', styleTag);
  app.addHelper('tag', tag);
}

async function include(ctx: MojoContext, options: RenderOptions, stash: Record<string, any>): Promise<string | null> {
  return await ctx.renderToString(options, stash);
}

function mojoFaviconTag(ctx: MojoContext): SafeString {
  return ctx.tag('link', {rel: 'icon', href: ctx.urlForFile('/mojo/favicon.ico')});
}

function scriptTag(ctx: MojoContext, target: string): SafeString {
  return ctx.tag('script', {src: ctx.urlForFile(target)});
}

function styleTag(ctx: MojoContext, target: string): SafeString {
  return ctx.tag('link', {rel: 'stylesheet', href: ctx.urlForFile(target)});
}

function tag(
  ctx: MojoContext,
  name: string,
  attrs: Record<string, string> = {},
  content: string | SafeString = ''
): SafeString {
  return new SafeString(DOM.newTag(name, attrs, content).toString());
}
