import type App from '../app.js';
import type {MojoDualContext, MojoRenderOptions, MojoStash} from '../types.js';
import type {InspectOptions} from 'util';
import {inspect} from 'util';

export default function viewHelpersPlugin (app: App): void {
  app.decorateContext('inspect', (object: MojoStash, options: InspectOptions) => inspect(object, options));

  app.addHelper('include',
    (ctx: MojoDualContext, options: MojoRenderOptions, stash: MojoStash) => ctx.renderToString(options, stash));

  app.addHelper('mojoFaviconTag', mojoFaviconTag);
  app.addHelper('scriptTag', scriptTag);
  app.addHelper('styleTag', styleTag);
}

function mojoFaviconTag (ctx: MojoDualContext): string {
  const url: string = ctx.urlForFile('/mojo/favicon.ico');
  return `<link rel="icon" href="${url}"></link>`;
}

function scriptTag (ctx: MojoDualContext, target: string): string {
  const url: string = ctx.urlForFile(target);
  return `<script src="${url}"></script>`;
}

function styleTag (ctx: MojoDualContext, target: string): string {
  const url: string = ctx.urlForFile(target);
  return `<link rel="stylesheet" href="${url}">`;
}
