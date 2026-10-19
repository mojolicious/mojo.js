import type {App} from '../app.ts';
import crypto from 'node:crypto';
import {parseArgs} from 'node:util';
import {version} from '../core.ts';
import * as util from '../util.ts';

/**
 * Minimal application generator command.
 */
export default async function createFullAppCommand(app: App, args: string[]): Promise<void> {
  const {values} = parseArgs({
    args: args.slice(1),
    options: {ts: {type: 'boolean'}},
    allowPositionals: true,
    allowNegative: true
  });
  const ts = values.ts === true;

  process.stdout.write('Generating application directory structure:\n');
  await util.cliCreateFile('config.yml', yamlConfig, {secret: crypto.randomBytes(16).toString('hex')});

  await util.cliCreateDir('views/layouts');
  await util.cliCreateFile('views/layouts/default.html.tmpl', tmplLayout);
  await util.cliCreateDir('views/example');
  await util.cliCreateFile('views/example/welcome.html.tmpl', tmplView);

  await util.cliCreateDir('public/assets');
  await util.cliCreateFile('public/index.html', staticFile);

  // TypeScript
  if (ts === true) {
    await util.cliCreateDir('src');
    await util.cliCreateFile('src/index.ts', jsIndex);

    await util.cliCreateDir('src/controllers');
    await util.cliCreateFile('src/controllers/example.ts', tsController);

    await util.cliCreateDir('src/models');

    await util.cliCreateDir('test');
    await util.cliCreateFile('test/example.js', jsTest, {indexPath: '../src/index.ts'});

    // Node.js runs the TypeScript sources directly, so tsc is only used for type checking
    const tsConfig = {
      compilerOptions: {
        lib: ['ESNext'],
        target: 'ESNext',
        module: 'nodenext',
        moduleResolution: 'nodenext',
        noEmit: true,
        allowImportingTsExtensions: true,
        erasableSyntaxOnly: true,
        verbatimModuleSyntax: true,
        noErrorTruncation: true,
        strict: true
      },
      include: ['src/**/*']
    };
    await util.cliCreateFile('tsconfig.json', JSON.stringify(tsConfig, null, 2));
    await util.cliFixPackage({
      dependencies: {'@mojojs/core': `^${version}`},
      devDependencies: await util.devDependencies(/^(@types\/node|nodemon|tap|typescript)$/),
      scripts: {
        check: 'npx tsc',
        dev: 'npx nodemon src/index.ts server',
        start: 'NODE_ENV=production node src/index.ts server -l http://*:8080',
        test: 'node --test test/*.js'
      }
    });
  }

  // JavaScript
  else {
    await util.cliCreateFile('index.js', jsIndex);

    await util.cliCreateDir('controllers');
    await util.cliCreateFile('controllers/example.js', jsController);

    await util.cliCreateDir('models');

    await util.cliCreateDir('test');
    await util.cliCreateFile('test/example.js', jsTest, {indexPath: '../index.js'});

    await util.cliFixPackage({
      dependencies: {'@mojojs/core': `^${version}`},
      devDependencies: await util.devDependencies(/^(nodemon|tap)$/),
      scripts: {
        dev: 'npx nodemon index.js server',
        start: 'NODE_ENV=production node index.js server -l http://*:8080',
        test: 'node --test test/*.js'
      }
    });
  }
}

createFullAppCommand.hidden = true;
createFullAppCommand.description = 'Create application directory structure';
createFullAppCommand.usage = `Usage: APPLICATION create-full-app [OPTIONS]

  node index.js create-full-app
  node index.js create-full-app --ts

Options:
  -h, --help   Show this summary of available options
      --ts     Generate TypeScript code instead of JavaScript
`;

const yamlConfig = `---
secrets:
  - <%= secret %>
`;

const jsIndex = `import mojo, {yamlConfigPlugin} from '@mojojs/core';

export const app = mojo();

app.plugin(yamlConfigPlugin);
app.secrets = app.config.secrets;

app.get('/').to('example#welcome');

app.start();
`;

const jsController = `export default class Controller {
  // Render template "example/welcome.html.tmpl" with message
  async welcome (ctx) {
    ctx.stash.msg = 'Welcome to the mojo.js real-time web framework!';
    await ctx.render();
  }
}
`;

const tsController = `import type {MojoContext} from '@mojojs/core';

export default class Controller {
  // Render template "example/welcome.html.tmpl" with message
  async welcome (ctx: MojoContext): Promise<void> {
    ctx.stash.msg = 'Welcome to the mojo.js real-time web framework!';
    await ctx.render();
  }
}
`;

const tmplLayout = `<!DOCTYPE html>
<html>
  <head>
    %%= await tags.favicon()
    <title>Welcome</title>
  </head>
  <body><%%= ctx.content.main %></body>
</html>
`;

const tmplView = `%% view.layout = 'default';
<h2><%%= msg %></h2>
<p>
  This page was generated from the template "views/example/welcome.html.tmpl" and the layout
  "views/layouts/default.html.tmpl", <a href="<%%= ctx.urlFor() %>">click here</a> to reload the page or
  <a href="<%%= ctx.urlForFile('index.html') %>">here</a> to move forward to a static page.
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

const jsTest = `import {app} from '<%= indexPath %>';
import t from 'tap';

app.log.level = 'debug';

t.test('Example application', async t => {
  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Index', async () => {
    (await ua.getOk('/')).statusIs(200).bodyLike(/mojo.js/);
  });

  await ua.stop();
});
`;
