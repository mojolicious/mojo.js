export default function defaultHelpersPlugin (app) {
  app.addHelper('exception', (ctx, error) => ctx.render({text: `Exception: ${error}`, status: 500}));
  app.addHelper('notFound', ctx => ctx.render({text: 'Not found', status: 404}));
}
