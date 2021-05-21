import crypto from 'crypto';
import * as util from './../util.js';

export default async function genLiteAppCommand (app, args) {
  const name = args[1] ?? 'index.js';

  await util.cliCreateFile('config.json', jsonConfig, {secret: crypto.randomBytes(16).toString('hex')});
  await util.cliCreateFile(name, jsIndex);

  await util.cliCreateDir('controllers');
  await util.cliCreateFile('controllers/example.js', jsController);

  await util.cliCreateDir('models');

  await util.cliCreateDir('views/layouts');
  await util.cliCreateFile('views/layouts/default.html.ejs', ejsLayout);
  await util.cliCreateDir('views/example');
  await util.cliCreateFile('views/example/welcome.html.ejs', ejsView);

  await util.cliCreateDir('public');
  await util.cliCreateFile('public/index.html', staticFile);

  await util.cliCreateDir('test');
  await util.cliCreateFile('test/example.js', jsTest);
}

genLiteAppCommand.description = 'Generate application directory structure';
genLiteAppCommand.usage = `Usage: APPLICATION gen-full-app [OPTIONS] [NAME]

  node index.js gen-full-app
  node index.js gen-full-app myapp

Options:
  -h, --help   Show this summary of available options
`;

const jsonConfig = `{
  "secrets": [
    "<%= secret %>"
  ]
}
`;

const jsIndex = `import mojo from '@mojojs/mojo';

export const app = mojo();

app.plugin(mojo.jsonConfigPlugin);
app.secrets = [app.config.secrets];

app.get('/').to('example#welcome');

app.start();
`;

const jsController = `export class Controller {
  // Render template "example/welcome.html.ejs" with message
  async welcome (ctx) {
    ctx.stash.msg = 'Welcome to the mojo.js real-time web framework!';
    await ctx.render();
  }
}
`;

const ejsLayout = `<!DOCTYPE html>
<html>
  <head><title>Welcome</title></head>
  <body><%%- view.content %></body>
</html>
`;

const ejsView = `<%% view.layout = 'default'; %%>
<h2><%%= msg %></h2>
<p>
  This page was generated from the template "views/example/welcome.html.ejs" and the layout
  "views/layouts/default.html.ejs", <a href="<%%= ctx.urlFor() %%>">click here</a> to reload the page or
  <a href="<%%= ctx.urlFor('/public/index.html') %%>">here</a> to move forward to a static page.
</p>
`;

const staticFile = `<!DOCTYPE html>
<html>
  <head>
    <title>Welcome to the mojo.js real-time web framework!</title>
  </head>
  <body>
    <h2>Welcome to the mojo.js real-time web framework!</h2>
    This is the static document "public/index.html", <a href="/">click here</a> to get back to the start.
  </body>
</html>
`;

const jsTest = `import {app} from '../index.js';
import t from 'tap';

t.test('Example application', async t => {
  const client = await app.newTestClient({tap: t});

  await t.test('Index', async t => {
    (await client.getOk('/')).statusIs(200).bodyLike(/mojo.js/);
  });

  await client.stop();
});
`;
