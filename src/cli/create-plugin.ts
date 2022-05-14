import type {App} from '../app.js';
import {version} from '../core.js';
import * as util from '../util.js';

/**
 * Plugin generator command.
 */
export default async function genPluginCommand(app: App, args: string[]): Promise<void> {
  const stdout = process.stdout;
  stdout.write('Generating plugin:\n');

  const name = args[1] ?? 'mojo-plugin-myplugin';
  const file = `lib/${name}.js`;

  await util.cliCreateDir('lib');
  await util.cliCreateFile(file, plugin);

  await util.cliCreateDir('test');
  await util.cliCreateFile('test/basic.js', test, {file});

  await util.cliCreateFile('README.md', readme, {name});

  await util.cliFixPackage({
    author: 'A Good Programmer <nospam@example.com>',
    description: 'A mojo.js plugin',
    dependencies: {'@mojojs/core': `^${version}`},
    devDependencies: {tap: '^16.0.0'},
    exports: './lib/plugin.js',
    files: ['lib/'],
    license: 'MIT',
    name,
    scripts: {test: 'tap --no-coverage test/*.js'},
    version: '0.0.1'
  });
}

genPluginCommand.description = 'Create plugin';
genPluginCommand.usage = `Usage: APPLICATION create-plugin [OPTIONS] [NAME]

  node index.js create-plugin
  node index.js create-plugin mojo-plugin-foo

Options:
  -h, --help   Show this summary of available options
`;

const plugin = `export default function myPlugin(app, options) {
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

  t.test('Basics', async () => {
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
