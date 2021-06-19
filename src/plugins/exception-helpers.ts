import type App from '../app.js';
import type WebSocketContext from '../context/websocket.js';
import type {MojoDualContext} from '../types.js';
import Logger from '../logger.js';
import {exceptionContext} from '../util.js';

export default function exceptionHelpersPlugin (app: App): void {
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
}

async function exception (ctx: MojoDualContext, error: Error): Promise<boolean> {
  if (ctx.isWebSocket) return ctx.websocketException(error);
  return ctx.httpException(error);
}

async function htmlException (ctx: MojoDualContext, error: Error): Promise<boolean> {
  ctx.stash.exception = error;

  const mode = ctx.app.mode;
  if (await ctx.render({view: `exception.${mode}`, maybe: true, status: 500}) === true) return true;
  if (await ctx.render({view: 'exception', maybe: true, status: 500}) === true) return true;

  const view = mode === 'development' ? 'mojo/debug' : 'mojo/exception';
  return ctx.render({view, status: 500, stringFormatter: Logger.stringFormatter, exceptionContext});
}

async function htmlNotFound (ctx: MojoDualContext): Promise<boolean> {
  const mode: string = ctx.app.mode;
  if (await ctx.render({view: `not-found.${mode}`, maybe: true, status: 404}) === true) return true;
  if (await ctx.render({view: 'not-found', maybe: true, status: 404}) === true) return true;

  const view = mode === 'development' ? 'mojo/debug' : 'mojo/not-found';
  return ctx.render({view, status: 404, stringFormatter: Logger.stringFormatter});
}

async function httpException (ctx: MojoDualContext, error: Error): Promise<boolean> {
  ctx.log.error(error.stack);

  const exceptionFormat = ctx.exceptionFormat;
  if (exceptionFormat === 'txt') return ctx.txtException(error);
  if (exceptionFormat === 'json') return ctx.jsonException(error);
  return ctx.htmlException(error);
}

async function jsonException (ctx: MojoDualContext, error: Error): Promise<boolean> {
  if (ctx.app.mode === 'development') {
    return ctx.render({
      json: {
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack
        }
      },
      pretty: true,
      status: 500
    });
  }

  return ctx.render({json: {error: {message: 'Internal Server Error'}}, pretty: true, status: 500});
}

async function jsonNotFound (ctx: MojoDualContext): Promise<boolean> {
  return ctx.render({json: {error: {message: 'Not Found'}}, pretty: true, status: 404});
}

async function notFound (ctx: MojoDualContext): Promise<boolean> {
  const exceptionFormat = ctx.exceptionFormat;
  if (exceptionFormat === 'txt') return ctx.txtNotFound();
  if (exceptionFormat === 'json') return ctx.jsonNotFound();
  return ctx.htmlNotFound();
}

async function txtException (ctx: MojoDualContext, error: Error): Promise<boolean> {
  if (ctx.app.mode === 'development') return ctx.render({text: error.stack, status: 500});
  return ctx.render({text: 'Internal Server Error', status: 500});
}

async function txtNotFound (ctx: MojoDualContext): Promise<boolean> {
  return ctx.render({text: 'Not Found', status: 404});
}

async function websocketException (ctx: MojoDualContext, error: Error): Promise<boolean> {
  ctx.log.error(error.stack);
  if ((ctx as WebSocketContext).isEstablished) ctx.ws.close(1011);
  return true;
}
