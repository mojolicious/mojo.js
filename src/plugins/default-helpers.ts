import type {MojoApp, MojoContext, RenderOptions, URLOptions, URLTarget} from '../types.js';
import type {InspectOptions} from 'util';
import {inspect} from 'util';
import {Logger} from '../logger.js';
import {SafeString} from '../util.js';
import {exceptionContext} from '../util.js';
import DOM from '@mojojs/dom';

/**
 * Default helper plugin.
 */
export default function defaultHelpersPlugin(app: MojoApp): void {
  // The types for all helpers are in "types.ts"
  app.addHelper('exception', exception);
  app.addHelper('htmlException', htmlException);
  app.addHelper('htmlNotFound', htmlNotFound);
  app.addHelper('httpException', httpException);
  app.addHelper('jsonException', jsonException);
  app.addHelper('jsonNotFound', jsonNotFound);
  app.addHelper('txtException', txtException);
  app.addHelper('txtNotFound', txtNotFound);
  app.addHelper('notFound', notFound);
  app.addHelper('websocketException', websocketException);

  app.addHelper('currentRoute', currentRoute);

  app.addHelper('include', include);

  app.addHelper('buttonTo', buttonTo);
  app.addHelper('faviconTag', faviconTag);
  app.addHelper('formTag', formTag);
  app.addHelper('imageTag', imageTag);
  app.addHelper('linkTo', linkTo);
  app.addHelper('scriptTag', scriptTag);
  app.addHelper('styleTag', styleTag);
  app.addHelper('submitButtonTag', submitButtonTag);
  app.addHelper('tag', tag);

  app.decorateContext('inspect', (object: Record<string, any>, options: InspectOptions) => inspect(object, options));
}

function buttonTo(ctx: MojoContext, target: URLTarget, attrs: Record<string, string>, text: string): SafeString {
  return ctx.formTag(target, attrs, ctx.submitButtonTag(text));
}

function currentRoute(ctx: MojoContext): string | null {
  const plan = ctx.plan;
  if (plan === null) return null;
  const endpoint = plan.endpoint;
  if (endpoint === undefined) return null;
  return endpoint.customName ?? endpoint.defaultName ?? null;
}

async function exception(ctx: MojoContext, error: Error): Promise<boolean> {
  if (ctx.isWebSocket) return ctx.websocketException(error);
  return ctx.httpException(error);
}

function faviconTag(ctx: MojoContext, file?: string): SafeString {
  return ctx.tag('link', {rel: 'icon', href: ctx.urlForFile(file ?? '/mojo/favicon.ico')});
}

function formTag(
  ctx: MojoContext,
  target: URLTarget,
  attrs: Record<string, string>,
  content: string | SafeString
): SafeString {
  target = urlTarget(target);
  const route = ctx.app.router.lookup(target[0]);
  const method = route === null ? 'GET' : route.suggestedMethod();

  const options = target[1];
  if (method !== 'GET') {
    attrs.method = 'POST';
    if (method !== 'POST') options.query = {_method: method};
  }

  const url = ctx.urlFor(...target);
  if (url !== null) attrs.action = url;

  return ctx.tag('form', attrs, content);
}

async function htmlException(ctx: MojoContext, error: Error): Promise<boolean> {
  ctx.stash.exception = error;

  const mode = ctx.app.mode;
  if (await ctx.render({view: `exception.${mode}`, maybe: true, status: 500})) return true;
  if (await ctx.render({view: 'exception', maybe: true, status: 500})) return true;

  const view = mode === 'development' ? 'mojo/debug' : 'mojo/exception';
  return await ctx.render({view, status: 500, stringFormatter: Logger.stringFormatter, exceptionContext});
}

async function htmlNotFound(ctx: MojoContext): Promise<boolean> {
  ctx.stash.exception = null;

  const mode: string = ctx.app.mode;
  if (await ctx.render({view: `not-found.${mode}`, maybe: true, status: 404})) return true;
  if (await ctx.render({view: 'not-found', maybe: true, status: 404})) return true;

  const view = mode === 'development' ? 'mojo/debug' : 'mojo/not-found';
  return await ctx.render({view, status: 404, stringFormatter: Logger.stringFormatter});
}

async function httpException(ctx: MojoContext, error: any): Promise<boolean> {
  error = ensureError(error);
  ctx.log.error(error.stack);

  const exceptionFormat = ctx.exceptionFormat;
  if (exceptionFormat === 'txt') return ctx.txtException(error);
  if (exceptionFormat === 'json') return ctx.jsonException(error);
  return ctx.htmlException(error);
}

function imageTag(ctx: MojoContext, target: string, attrs: Record<string, string> = {}): SafeString {
  return ctx.tag('img', {src: ctx.urlForFile(target), ...attrs});
}

async function include(
  ctx: MojoContext,
  options: RenderOptions,
  stash: Record<string, any>
): Promise<SafeString | null> {
  const str = await ctx.renderToString(options, stash);
  return str === null ? null : new SafeString(str);
}

async function jsonException(ctx: MojoContext, error: Error): Promise<boolean> {
  if (ctx.app.mode === 'development') {
    return await ctx.render({
      json: {
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack ?? ''
        }
      },
      pretty: true,
      status: 500
    });
  }

  return await ctx.render({json: {error: {message: 'Internal Server Error'}}, pretty: true, status: 500});
}

async function jsonNotFound(ctx: MojoContext): Promise<boolean> {
  return await ctx.render({json: {error: {message: 'Not Found'}}, pretty: true, status: 404});
}

function linkTo(
  ctx: MojoContext,
  target: URLTarget,
  attrs: Record<string, string>,
  content: string | SafeString
): SafeString {
  const href = ctx.urlFor(...urlTarget(target)) ?? '';
  return ctx.tag('a', {href, ...attrs}, content);
}

async function notFound(ctx: MojoContext): Promise<boolean> {
  const exceptionFormat = ctx.exceptionFormat;
  if (exceptionFormat === 'txt') return ctx.txtNotFound();
  if (exceptionFormat === 'json') return ctx.jsonNotFound();
  return ctx.htmlNotFound();
}

function scriptTag(ctx: MojoContext, target: string): SafeString {
  return ctx.tag('script', {src: ctx.urlForFile(target)});
}

function styleTag(ctx: MojoContext, target: string): SafeString {
  return ctx.tag('link', {rel: 'stylesheet', href: ctx.urlForFile(target)});
}

function submitButtonTag(ctx: MojoContext, text = 'Ok', attrs: Record<string, string> = {}): SafeString {
  return ctx.tag('input', {value: text, ...attrs, type: 'submit'});
}

function tag(
  ctx: MojoContext,
  name: string,
  attrs: Record<string, string> = {},
  content: string | SafeString = ''
): SafeString {
  return new SafeString(DOM.newTag(name, attrs, content).toString());
}

async function txtException(ctx: MojoContext, error: Error): Promise<boolean> {
  if (ctx.app.mode === 'development') {
    return await ctx.render({text: error.stack as string, status: 500});
  }
  return await ctx.render({text: 'Internal Server Error', status: 500});
}

async function txtNotFound(ctx: MojoContext): Promise<boolean> {
  return await ctx.render({text: 'Not Found', status: 404});
}

async function websocketException(ctx: MojoContext, error: any): Promise<boolean> {
  error = ensureError(error);
  ctx.log.error(error.stack);

  const ws = ctx.ws;
  if (ws !== null && ctx.isEstablished) ws.close(1011);
  return true;
}

function urlTarget(target: URLTarget): [string, URLOptions] {
  return typeof target === 'string' ? [target, {}] : target;
}

// If you see this then your code has thrown something that was not an Error object
function ensureError(error: any): Error {
  return error instanceof Error ? error : new Error(error);
}
