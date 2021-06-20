import type App from '../app.js';
import type {MojoContext, MojoRenderOptions, MojoStash} from '../types.js';
import type {InspectOptions} from 'util';
import {inspect} from 'util';

export default function viewHelpersPlugin (app: App): void {
  app.decorateContext('inspect', (object: MojoStash, options: InspectOptions) => inspect(object, options));

  app.addHelper('include',
    async (ctx: MojoContext, options: MojoRenderOptions, stash: MojoStash) => await ctx.renderToString(options, stash));

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
