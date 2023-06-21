import type {App} from '../app.js';
import {version} from '../core.js';
import * as util from '../util.js';

/**
 * Application generator command.
 */
export default async function createLiteAppCommand(app: App, args: string[]): Promise<void> {
  const stdout = process.stdout;
  stdout.write('Generating single file application:\n');
  await util.cliCreateFile(args[1] ?? 'index.js', liteApp);
  await util.cliFixPackage();
  await util.cliFixPackage({dependencies: {'@mojojs/core': `^${version}`}});
  stdout.write(tip);
}

createLiteAppCommand.hidden = true;
createLiteAppCommand.description = 'Create single file application';
createLiteAppCommand.usage = `Usage: APPLICATION create-lite-app [OPTIONS] [NAME]

  node index.js create-lite-app
  node index.js create-lite-app myapp.js

Options:
  -h, --help   Show this summary of available options
`;

const tip = `
Tip: Single file applications are best used for prototyping, for anything more
     complicated we recommend the use of a full mojo.js application.
`;

const liteApp = `import mojo from '@mojojs/core';

const app = mojo();

app.any('/', async ctx => {
  await ctx.render({inline: indexTemplate, inlineLayout: defaultLayout}, {title: 'Welcome'});
});

app.websocket('/heading', ctx => {
  ctx.on('connection', ws => {
    ws.send('Welcome to the mojo.js real-time web framework!');
  });
});

app.start();

const indexTemplate = \`
<h1>Waiting...</h1>
<script>
  const ws = new WebSocket('<%%= ctx.urlFor('heading') %>');
  ws.onmessage = event => { document.querySelector('h1').innerHTML = event.data };
</script>
\`;

const defaultLayout = \`
<!DOCTYPE html>
<html>
  <head>
    <%%= await tags.favicon() %>
    <title><%%= title %></title>
  </head>
  <body><%%= ctx.content.main %></body>
</html>
\`;
`;
