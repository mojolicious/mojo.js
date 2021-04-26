export default function defaultHelpersPlugin (app) {
  app.addHelper('notFound', ctx => ctx.render({text: 'Not found', status: 404}));
}
