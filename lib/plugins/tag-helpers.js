export default function tagHelpersPlugin (app) {
  app.addHelper('mojoFaviconTag', mojoFaviconTag);
  app.addHelper('scriptTag', scriptTag);
  app.addHelper('styleTag', styleTag);
}

function mojoFaviconTag (ctx) {
  const url = ctx.urlForStatic('/mojo/favicon.ico');
  return `<link rel="icon" href="${url}"></link>`;
}

function scriptTag (ctx, target) {
  const url = ctx.urlForStatic(target);
  return `<script src="${url}"></script>`;
}

function styleTag (ctx, target) {
  const url = ctx.urlForStatic(target);
  return `<link rel="stylesheet" href="${url}">`;
}
