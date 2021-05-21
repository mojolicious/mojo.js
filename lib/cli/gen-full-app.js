import crypto from 'crypto';
import * as util from './../util.js';

export default async function genLiteAppCommand (app, args) {
  const name = args[1] ?? 'myapp';

  await util.cliCreateDir(name);

  await util.cliCreateFile(`${name}/config.json`, jsonConfig, {secret: crypto.randomBytes(16).toString('hex')});
  await util.cliCreateFile(`${name}/index.js`, jsIndex);
  await util.cliCreateFile(`${name}/package.json`, jsonPackage);

  await util.cliCreateDir(`${name}/controllers`);
  await util.cliCreateFile(`${name}/controllers/example.js`, jsController);

  await util.cliCreateDir(`${name}/models`);

  await util.cliCreateDir(`${name}/views/layouts`);
  await util.cliCreateFile(`${name}/views/layouts/default.html.ejs`, ejsLayout);
  await util.cliCreateDir(`${name}/views/example`);
  await util.cliCreateFile(`${name}/views/example/welcome.html.ejs`, ejsView);

  await util.cliCreateDir(`${name}/public`);
  await util.cliCreateFile(`${name}/public/index.html`, staticFile);

  await util.cliCreateDir(`${name}/test`);
  await util.cliCreateFile(`${name}/test/example.js`, jsTest);
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

const jsonPackage = `{
  "scripts": {
    "test": "tap --no-coverage test/*.js"
  },
  "main": "./index.js",
  "type": "module",
  "devDependencies": {
    "tap": ">=15.0.6"
  },
  "engines": {
    "node": ">= 15"
  },
  "dependencies": {
    "@mojojs/mojo": ">=0.0.1-alpha.12"
  }
}
`;

const jsController = `export class Controller {
  // This action will render a template
  async welcome (ctx) {
  
    // Render template "example/welcome.html.ep" with message
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
