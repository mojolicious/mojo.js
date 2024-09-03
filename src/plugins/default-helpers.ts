import type {
  MojoApp,
  MojoContext,
  MojoRenderOptions,
  MojoURLOptions,
  TagAttrs,
  TagContent,
  URLTarget,
  UserAgentRequestOptions
} from '../types.js';
import {inspect, type InspectOptions} from 'node:util';
import {Logger} from '../logger.js';
import {exceptionContext, SafeString} from '../util.js';
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

  app.addHelper('proxyGet', proxyGet);
  app.addHelper('proxyPost', proxyPost);
  app.addHelper('proxyRequest', proxyRequest);

  app.addHelper('currentRoute', currentRoute);

  app.addHelper('include', include);

  app.addHelper('tags.asset', assetTag);
  const fields = [
    'color',
    'date',
    'datetime',
    'email',
    'month',
    'number',
    'range',
    'search',
    'tel',
    'time',
    'text',
    'url',
    'week'
  ];
  for (const type of fields) {
    app.addHelper(`tags.${type}Field`, async (ctx: MojoContext, name: string, attrs: TagAttrs = {}) => {
      return await inputTag(ctx, name, {...attrs, type});
    });
  }
  app.addHelper('tags.input', inputTag);
  app.addHelper('tags.checkBox', checkBoxTag);
  app.addHelper('tags.radioButton', radioButtonTag);
  app.addHelper('tags.textArea', textAreaTag);
  app.addHelper('tags.buttonTo', buttonTo);
  app.addHelper('tags.favicon', faviconTag);
  app.addHelper('tags.fileField', fileFieldTag);
  app.addHelper('tags.formFor', formFor);
  app.addHelper('tags.hiddenField', hiddenFieldTag);
  app.addHelper('tags.image', imageTag);
  app.addHelper('tags.labelFor', labelFor);
  app.addHelper('tags.linkTo', linkTo);
  app.addHelper('tags.passwordField', passwordFieldTag);
  app.addHelper('tags.script', scriptTag);
  app.addHelper('tags.style', styleTag);
  app.addHelper('tags.submitButton', submitButtonTag);

  // Temporary workaround for backwards compatibility, to be removed in 2.0
  app.addHelper('assetTag', assetTag);
  for (const type of fields) {
    app.addHelper(`${type}FieldTag`, async (ctx: MojoContext, name: string, attrs: TagAttrs = {}) => {
      return await inputTag(ctx, name, {...attrs, type});
    });
  }
  app.addHelper('inputTag', inputTag);
  app.addHelper('checkBoxTag', checkBoxTag);
  app.addHelper('radioButtonTag', radioButtonTag);
  app.addHelper('textAreaTag', textAreaTag);
  app.addHelper('buttonTo', buttonTo);
  app.addHelper('faviconTag', faviconTag);
  app.addHelper('fileFieldTag', fileFieldTag);
  app.addHelper('formFor', formFor);
  app.addHelper('hiddenFieldTag', hiddenFieldTag);
  app.addHelper('imageTag', imageTag);
  app.addHelper('labelFor', labelFor);
  app.addHelper('linkTo', linkTo);
  app.addHelper('passwordFieldTag', passwordFieldTag);
  app.addHelper('scriptTag', scriptTag);
  app.addHelper('styleTag', styleTag);
  app.addHelper('submitButtonTag', submitButtonTag);

  app.addHelper('tag', tag);

  app.decorateContext('inspect', (object: Record<string, any>, options: InspectOptions) => inspect(object, options));
}

function assetTag(ctx: MojoContext, path: string, attrs?: TagAttrs): Promise<SafeString> {
  const url = ctx.urlForAsset(path);
  if (/\.js$/.test(url)) return ctx.tag('script', {src: url, ...attrs});
  if (/\.css$/.test(url)) return ctx.tag('link', {rel: 'stylesheet', href: url, ...attrs});
  return ctx.tag('img', {src: url, ...attrs});
}

function buttonTo(ctx: MojoContext, target: URLTarget, attrs: TagAttrs, text: string): Promise<SafeString> {
  return ctx.formFor(target, attrs, ctx.submitButtonTag(text));
}

async function checkBoxTag(ctx: MojoContext, name: string, attrs: TagAttrs = {}) {
  return await inputTag(ctx, name, {...attrs, type: 'checkbox'});
}

function currentRoute(ctx: MojoContext): string | null {
  const {plan} = ctx;
  if (plan === null) return null;
  const {endpoint} = plan;
  if (endpoint === undefined) return null;
  return endpoint.customName ?? endpoint.defaultName ?? null;
}

async function exception(ctx: MojoContext, error: Error): Promise<boolean> {
  if (ctx.isWebSocket) return ctx.websocketException(error);
  return ctx.httpException(error);
}

function faviconTag(ctx: MojoContext, file?: string): Promise<SafeString> {
  return ctx.tag('link', {rel: 'icon', href: ctx.urlForFile(file ?? '/mojo/favicon.ico')});
}

async function fileFieldTag(ctx: MojoContext, name: string, attrs: TagAttrs = {}) {
  return tag(ctx, 'input', {...attrs, type: 'file', name});
}

function formFor(ctx: MojoContext, target: URLTarget, attrs: TagAttrs, content: TagContent): Promise<SafeString> {
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

async function hiddenFieldTag(ctx: MojoContext, name: string, value: string, attrs: TagAttrs = {}) {
  return tag(ctx, 'input', {...attrs, type: 'hidden', name, value});
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

  const {mode} = ctx.app;
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

function imageTag(ctx: MojoContext, target: string, attrs: TagAttrs = {}): Promise<SafeString> {
  return ctx.tag('img', {src: ctx.urlForFile(target), ...attrs});
}

async function inputTag(ctx: MojoContext, name: string, attrs: TagAttrs = {}): Promise<SafeString> {
  attrs.name = name;

  const params = await ctx.params();
  const values = params.getAll(name);
  if (values.length > 0) {
    // Checkbox and radio-button
    const type = attrs.type;
    if (type === 'checkbox' || type === 'radio') {
      const value = attrs.value ?? 'on';
      delete attrs.checked;
      if (typeof value === 'string' && values.includes(value)) attrs.checked = true;
    }

    // Others
    else {
      attrs.value = values[values.length - 1];
    }
  }

  return ctx.tag('input', attrs);
}

async function include(
  ctx: MojoContext,
  options: MojoRenderOptions,
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

async function labelFor(ctx: MojoContext, name: string, value: TagContent, attrs: TagAttrs = {}) {
  return tag(ctx, 'label', {...attrs, type: 'hidden', for: name}, value);
}

function linkTo(ctx: MojoContext, target: URLTarget, attrs: TagAttrs, content: TagContent): Promise<SafeString> {
  const href = ctx.urlFor(...urlTarget(target)) ?? '';
  return ctx.tag('a', {href, ...attrs}, content);
}

async function notFound(ctx: MojoContext): Promise<boolean> {
  const {exceptionFormat} = ctx;
  if (exceptionFormat === 'txt') return ctx.txtNotFound();
  if (exceptionFormat === 'json') return ctx.jsonNotFound();
  return ctx.htmlNotFound();
}

async function passwordFieldTag(ctx: MojoContext, name: string, attrs: TagAttrs = {}) {
  return tag(ctx, 'input', {...attrs, type: 'password', name});
}

async function proxyGet(ctx: MojoContext, url: string | URL, config: UserAgentRequestOptions): Promise<void> {
  await ctx.proxyRequest({method: 'GET', url, ...config});
}

async function proxyPost(ctx: MojoContext, url: string | URL, config: UserAgentRequestOptions): Promise<void> {
  await ctx.proxyRequest({method: 'POST', url, ...config});
}

async function proxyRequest(ctx: MojoContext, config: UserAgentRequestOptions): Promise<void> {
  const proxyRes = await ctx.ua.request(config);
  proxyRes.autoDecompress = false;
  const {statusCode, headers} = proxyRes;
  const stream = proxyRes.createReadStream();

  const {res} = ctx;
  res.statusCode = statusCode;
  res.headers = headers.clone().dehop();
  process.nextTick(() => res.send(stream));
}

async function radioButtonTag(ctx: MojoContext, name: string, attrs: TagAttrs = {}) {
  return await inputTag(ctx, name, {...attrs, type: 'radio'});
}

function scriptTag(ctx: MojoContext, target: string, attrs: TagAttrs = {}): Promise<SafeString> {
  return ctx.tag('script', {src: ctx.urlForFile(target), ...attrs});
}

function styleTag(ctx: MojoContext, target: string, attrs: TagAttrs = {}): Promise<SafeString> {
  return ctx.tag('link', {rel: 'stylesheet', href: ctx.urlForFile(target), ...attrs});
}

function submitButtonTag(ctx: MojoContext, text = 'Ok', attrs: TagAttrs = {}): Promise<SafeString> {
  return ctx.tag('input', {value: text, ...attrs, type: 'submit'});
}

function tag(ctx: MojoContext, name: string, attrs: TagAttrs = {}, content: TagContent = ''): Promise<SafeString> {
  if (content instanceof Function) content = content();
  if (content instanceof Promise) return content.then(text => new SafeString(DOM.newTag(name, attrs, text).toString()));
  // Temporary workaround for backwards compatibility, to be removed in 2.0
  return new SafeString(DOM.newTag(name, attrs, content).toString()) as any as Promise<SafeString>;
}

async function textAreaTag(
  ctx: MojoContext,
  name: string,
  attrs: TagAttrs = {},
  content?: TagContent
): Promise<SafeString> {
  attrs.name = name;

  const params = await ctx.params();
  const value = params.get(name);
  if (value !== null) content = value;

  return ctx.tag('textarea', {...attrs, name}, content);
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

function urlTarget(target: URLTarget): [string, MojoURLOptions] {
  return typeof target === 'string' ? [target, {}] : target;
}

// If you see this then your code has thrown something that was not an Error object
function ensureError(error: any): Error {
  return error instanceof Error ? error : new Error(error);
}
