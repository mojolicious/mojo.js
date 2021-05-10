export default function tagHelpersPlugin (app) {
  app.addHelper('mojoFaviconTag', mojoFaviconTag);
  app.addHelper('scriptTag', scriptTag);
  app.addHelper('styleTag', styleTag);
}

function mojoFaviconTag () {
  const url = this.urlForFile('/mojo/favicon.ico');
  return `<link rel="icon" href="${url}"></link>`;
}

function scriptTag (target) {
  const url = this.urlForFile(target);
  return `<script src="${url}"></script>`;
}

function styleTag (target) {
  const url = this.urlForFile(target);
  return `<link rel="stylesheet" href="${url}">`;
}
