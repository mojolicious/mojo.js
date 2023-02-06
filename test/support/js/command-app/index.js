import mojo from '../../../../lib/core.js';
import Path from '@mojojs/path';

export const app = mojo();

if (app.mode === 'development') app.log.level = 'debug';

app.addAppHook('command:before', (app, args) => {
  if (args[2] === 'hook-command-get') {
    const mode = app.mode;
    process.stdout.write(Buffer.from(`command:before: ${mode}`));
    args[2] = 'get';
  }
});

app.addAppHook('command:before', async () => {
  if (process.env.MOJO_COMMAND_TEST !== undefined) {
    process.stdout.write(Buffer.from(`command:before: skip cli`));
    return true;
  }
});

app.addAppHook('command:init', async (app, args) => {
  const mode = app.mode;
  process.stdout.write(Buffer.from(`command:init: ${mode} ${args[2]}`));
});

app.addAppHook('command:init', async () => {
  if (process.env.MOJO_COMMAND_TEST2 !== undefined) {
    process.stdout.write(Buffer.from(`command:init: skip cli`));
    return true;
  }
});

app.addAppHook('app:start', app => {
  app.cli.commandPaths.push(Path.currentFile().sibling('cli-more').toString());
  const mode = app.mode;
  process.stdout.write(Buffer.from(`app:start: ${mode}`));
});

app.addAppHook('server:start', app => {
  const mode = app.mode;
  process.stdout.write(Buffer.from(`server:start: ${mode}`));
});

app.addAppHook('command:after', (app, args) => {
  if (args[2] === 'get') process.stdout.write(Buffer.from(`command:after: ${app.mode}`));
});

app.addAppHook('app:stop', app => {
  const mode = app.mode;
  process.stdout.write(Buffer.from(`app:stop: ${mode}`));
});

app.addAppHook('server:stop', app => {
  const mode = app.mode;
  process.stdout.write(Buffer.from(`server:stop: ${mode}`));
});

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'})).name('root');

app.any('/index.html', ctx => ctx.render({text: '<h1>First</h1><h2>Second</h2>'}));

app.post('/redirect', ctx => ctx.redirectTo('root'));

const foo = app.get('/foo');
foo.post('/bar').name('bar');
foo.get('/baz', {ext: 'html'});

app.start();
