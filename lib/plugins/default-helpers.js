export default function defaultHelpersPlugin (app) {
  app.addHelper('exception', exception);
  app.addHelper('include', (ctx, options, stash) => ctx.renderToString(options, stash));
  app.addHelper('notFound', notFound);
}

function exception (ctx, error) {
  ctx.log.error(error.stack);
  ctx.stash.exception = error;
  const view = ctx.app.mode === 'development' ? 'mojo/debug' : 'mojo/exception';
  ctx.render({view, status: 500});
}

function notFound (ctx) {
  const view = ctx.app.mode === 'development' ? 'mojo/debug' : 'mojo/not-found';
  ctx.render({view, status: 404});
}
