import mojo from '../../../../lib/core.js';

export const app = mojo();

if (app.mode === 'development') app.log.level = 'debug';

app.addAppHook('command:before', (app, args) => {
  if (args[2] === 'hook-command-get') {
    const mode = app.mode;
    process.stdout.write(Buffer.from(`before: ${mode}`));
    args[2] = 'get';
  }
});

app.addAppHook('app:start', app => {
  const mode = app.mode;
  process.stdout.write(Buffer.from(`start: ${mode}`));
});

app.addAppHook('command:after', (app, args) => {
  if (args[2] === 'get') process.stdout.write(Buffer.from(`after: ${app.mode}`));
});

app.addAppHook('app:stop', app => {
  const mode = app.mode;
  process.stdout.write(Buffer.from(`stop: ${mode}`));
});

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'})).name('root');

app.any('/index.html', ctx => ctx.render({text: '<h1>First</h1><h2>Second</h2>'}));

app.post('/redirect', ctx => ctx.redirectTo('root'));

const foo = app.get('/foo');
foo.post('/bar').name('bar');
foo.get('/baz', {ext: 'html'});

app.start();
