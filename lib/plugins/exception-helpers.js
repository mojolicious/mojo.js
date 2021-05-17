export default function exceptionHelpersPlugin (app) {
  app.addHelper('exception', exception);
  app.addHelper('htmlException', htmlException);
  app.addHelper('htmlNotFound', htmlNotFound);
  app.addHelper('jsonException', jsonException);
  app.addHelper('jsonNotFound', jsonNotFound);
  app.addHelper('txtException', txtException);
  app.addHelper('txtNotFound', txtNotFound);
  app.addHelper('notFound', notFound);
}

function exception (ctx, error) {
  ctx.log.error(error.stack);
  if (ctx.exceptionFormat === 'txt') return ctx.txtException(error);
  if (ctx.exceptionFormat === 'json') return ctx.jsonException(error);
  return ctx.htmlException(error);
}

function htmlException (ctx, error) {
  ctx.stash.exception = error;
  const view = ctx.app.mode === 'development' ? 'mojo/debug' : 'mojo/exception';
  return ctx.render({view, status: 500});
}

function htmlNotFound (ctx) {
  const view = ctx.app.mode === 'development' ? 'mojo/debug' : 'mojo/not-found';
  return ctx.render({view, status: 404});
}

function jsonException (ctx, error) {
  if (ctx.app.mode === 'development') {
    return ctx.render({json: {error: {message: error.message, name: error.name, stack: error.stack}}, status: 500});
  }
  return ctx.render({json: {error: {message: 'Internal Server Error'}}, status: 500});
}

function jsonNotFound (ctx) {
  return ctx.render({json: {error: {message: 'Not Found'}}, status: 404});
}

function notFound (ctx) {
  if (ctx.exceptionFormat === 'txt') return ctx.txtNotFound();
  if (ctx.exceptionFormat === 'json') return ctx.jsonNotFound();
  return ctx.htmlNotFound();
}

function txtException (ctx, error) {
  if (ctx.app.mode === 'development') return ctx.render({text: error.stack, status: 500});
  return ctx.render({text: 'Internal Server Error', status: 500});
}

function txtNotFound (ctx) {
  return ctx.render({text: 'Not Found', status: 404});
}
