import type {App} from '../app.js';
import crypto from 'crypto';
import {version} from '../core.js';
import * as util from '../util.js';
import nopt from 'nopt';

/**
 * Minimal application generator command.
 */
export default async function createFullAppCommand(app: App, args: string[]): Promise<void> {
  const parsed = nopt({typescript: Boolean}, {t: '--typescript'}, args, 1);
  const ts = parsed.typescript === true;

  process.stdout.write('Generating application directory struture:\n');
  await util.cliCreateFile('config.yml', yamlConfig, {secret: crypto.randomBytes(16).toString('hex')});

  await util.cliCreateDir('views/layouts');
  await util.cliCreateFile('views/layouts/default.html.tmpl', tmplLayout);
  await util.cliCreateDir('views/example');
  await util.cliCreateFile('views/example/welcome.html.tmpl', tmplView);

  await util.cliCreateDir('public');
  await util.cliCreateFile('public/index.html', staticFile);

  // TypeScript
  if (ts === true) {
    await util.cliCreateDir('src');
    await util.cliCreateFile('src/index.ts', jsIndex);

    await util.cliCreateDir('src/controllers');
    await util.cliCreateFile('src/controllers/example.ts', tsController);

    await util.cliCreateDir('src/models');

    await util.cliCreateDir('test');
    await util.cliCreateFile('test/example.js', jsTest, {indexPath: '../lib/index.js'});

    const tsConfig = {
      compilerOptions: {
        lib: ['ESNext', 'DOM'],
        target: 'ES2020',
        module: 'ES2020',
        sourceMap: true,
        declaration: true,
        incremental: true,
        moduleResolution: 'node',
        esModuleInterop: true,
        noErrorTruncation: true,
        strict: true,
        outDir: 'lib',
        rootDir: 'src',
        composite: true
      },
      include: ['src/**/*']
    };
    await util.cliCreateFile('tsconfig.json', JSON.stringify(tsConfig, null, 2));
    await util.cliFixPackage({
      dependencies: {'@mojojs/core': `^${version}`},
      devDependencies: {
        '@types/busboy': '^1.5.0',
        '@types/node': '^18.0.0',
        '@types/stack-utils': '^2.0.1',
        '@types/tap': '^15.0.7',
        '@types/tough-cookie': '^4.0.2',
        '@types/ws': '^8.5.3',
        tap: '^16.3.0',
        typescript: '^4.7.0'
      },
      scripts: {
        build: 'npx tsc --build ./',
        'build:test': 'npm run build && npm test',
        test: 'tap --no-coverage test/*.js'
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
      devDependencies: {tap: '^16.3.0'},
      scripts: {
        test: 'tap --no-coverage test/*.js'
      }
    });
  }
}

createFullAppCommand.description = 'Create application directory structure';
createFullAppCommand.usage = `Usage: APPLICATION create-full-app [OPTIONS]

  node index.js create-full-app
  node index.js create-full-app --typescript

Options:
  -h, --help         Show this summary of available options
  -t, --typescript   Generate TypeScript code instead of JavaScript
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
    %%= ctx.faviconTag()
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
  <a href="<%%= ctx.urlForFile('/index.html') %>">here</a> to move forward to a static page.
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

  await t.test('Index', async t => {
    (await ua.getOk('/')).statusIs(200).bodyLike(/mojo.js/);
  });

  await ua.stop();
});
`;
