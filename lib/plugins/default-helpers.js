export default function defaultHelpersPlugin (app) {
  app.addHelper('exception', exception);
  app.addHelper('include', include);
  app.addHelper('notFound', notFound);
}

function exception (error) {
  this.log.error(error.stack);
  this.stash.exception = error;
  const view = this.app.mode === 'development' ? 'mojo/debug' : 'mojo/exception';
  this.render({view, status: 500});
}

function include (options, stash) {
  return this.renderToString(options, stash);
}

function notFound () {
  const view = this.app.mode === 'development' ? 'mojo/debug' : 'mojo/not-found';
  this.render({view, status: 404});
}
