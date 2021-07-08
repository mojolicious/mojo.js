import type {MojoApp, MojoContext, MojoRenderOptions} from '../types.js';
import type {InspectOptions} from 'util';
import {inspect} from 'util';

export default function viewHelpersPlugin (app: MojoApp): void {
  app.decorateContext('inspect', (object: Record<string, any>, options: InspectOptions) => inspect(object, options));

  app.addHelper('include', async (ctx: MojoContext, options: MojoRenderOptions, stash: Record<string, any>) => {
    return await ctx.renderToString(options, stash);
  });

  app.addHelper('mojoFaviconTag', mojoFaviconTag);
  app.addHelper('scriptTag', scriptTag);
  app.addHelper('styleTag', styleTag);
}

function mojoFaviconTag (ctx: MojoContext): string {
  const url: string = ctx.urlForFile('/mojo/favicon.ico');
  return `<link rel="icon" href="${url}"></link>`;
}

function scriptTag (ctx: MojoContext, target: string): string {
  const url: string = ctx.urlForFile(target);
  return `<script src="${url}"></script>`;
}

function styleTag (ctx: MojoContext, target: string): string {
  const url: string = ctx.urlForFile(target);
  return `<link rel="stylesheet" href="${url}">`;
}
