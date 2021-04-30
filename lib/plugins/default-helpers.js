export default function defaultHelpersPlugin (app) {
  app.addHelper('exception', exception);
  app.addHelper('notFound', ctx => ctx.render({text: 'Not found', status: 404}));
}

function exception (ctx, error) {
  ctx.log.error(error);
  ctx.render({text: `Exception: ${error}`, status: 500});
}
