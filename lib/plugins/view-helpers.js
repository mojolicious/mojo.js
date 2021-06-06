import util from 'util';

export default function viewHelpersPlugin (app) {
  app.decorateContext('inspect', (object, options) => util.inspect(object, options));

  app.addHelper('include', (ctx, options, stash) => ctx.renderToString(options, stash));

  app.addHelper('mojoFaviconTag', mojoFaviconTag);
  app.addHelper('scriptTag', scriptTag);
  app.addHelper('styleTag', styleTag);
}

function mojoFaviconTag (ctx) {
  const url = ctx.urlForFile('/mojo/favicon.ico');
  return `<link rel="icon" href="${url}"></link>`;
}

function scriptTag (ctx, target) {
  const url = ctx.urlForFile(target);
  return `<script src="${url}"></script>`;
}

function styleTag (ctx, target) {
  const url = ctx.urlForFile(target);
  return `<link rel="stylesheet" href="${url}">`;
}
