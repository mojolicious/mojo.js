import type {App} from '../app.js';
import {version} from '../core.js';
import * as util from '../util.js';
import nopt from 'nopt';

/**
 * Plugin generator command.
 */
export default async function createPluginCommand(app: App, args: string[]): Promise<void> {
  const parsed = nopt({ts: Boolean}, {}, args, 1);
  const ts = parsed.ts === true;

  const stdout = process.stdout;
  stdout.write('Generating plugin:\n');

  const name = parsed.argv.remain[0] ?? 'mojo-plugin-myplugin';
  const file = `lib/${name}.js`;

  await util.cliCreateDir('test');
  await util.cliCreateFile('test/basic.js', test, {file});

  await util.cliCreateFile('README.md', readme, {name});

  const commonSettings = {
    author: 'A Good Programmer <nospam@example.com>',
    description: 'A mojo.js plugin',
    dependencies: {'@mojojs/core': `^${version}`},
    exports: './lib/plugin.js',
    files: ['lib/'],
    name,
    license: 'MIT',
    version: '0.0.1'
  };

  // TypeScript
  if (ts === true) {
    const tsFile = `src/${name}.ts`;
    await util.cliCreateDir('src');
    await util.cliCreateFile(tsFile, tsPlugin);

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
      ...commonSettings,
      devDependencies: await util.devDependencies(/^(@types\/.+|tap|typescript)$/),
      scripts: {
        build: 'npx tsc --build ./',
        'build:test': 'npm run build && npm test',
        'build:watch': 'npm run build -- --watch',
        test: 'node --test test/*.js'
      }
    });
  }

  // JavaScript
  else {
    await util.cliCreateDir('lib');
    await util.cliCreateFile(file, jsPlugin);

    await util.cliFixPackage({
      ...commonSettings,
      devDependencies: await util.devDependencies(/^tap$/),
      scripts: {test: 'node --test test/*.js'}
    });
  }
}

createPluginCommand.hidden = true;
createPluginCommand.description = 'Create plugin';
createPluginCommand.usage = `Usage: APPLICATION create-plugin [OPTIONS] [NAME]

  node index.js create-plugin
  node index.js create-plugin mojo-plugin-foo

Options:
  -h, --help   Show this summary of available options
      --ts     Generate TypeScript code instead of JavaScript
`;

const jsPlugin = `export default function myPlugin(app, options) {
  // Add plugin code here
}
`;

const tsPlugin = `import type {MojoApp} from '@mojojs/core';

export default function myPlugin(app: MojoApp, options: Record<string, any>) {
  // Add plugin code here
}
`;

const test = `import mojo from '@mojojs/core';
import t from 'tap';
import myPlugin from '../<%= file %>';

t.test('myPlugin', async t => {
  const app = mojo();
  app.plugin(myPlugin);

  app.get('/', async ctx => {
    await ctx.render({text: 'Hello World!'});
  });

  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Basics', async () => {
    (await ua.getOk('/')).statusIs(200).bodyIs('Hello World!');
  });

  await ua.stop();
});
`;

const readme = `
A mojo.js plugin.

\`\`\`js
import mojo from '@mojojs/core';
import myPlugin from '<%= name %>';

const app = mojo();
app.plugin(myPlugin);

app.get('/', async ctx => {
  await ctx.render({text: 'Hello World!'});
});

app.start();
\`\`\`

## Installation

All you need is Node.js 16.0.0 (or newer).

\`\`\`
$ npm install <%= name %>
\`\`\`
`;
