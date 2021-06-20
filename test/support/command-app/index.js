import mojo from '../../../lib/core.js';

export const app = mojo();

if (app.mode === 'development') app.log.level = 'debug';

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'})).name('root');

app.any('/index.html', ctx => ctx.render({text: '<h1>First</h1><h2>Second</h2>'}));

app.post('/redirect', ctx => ctx.redirectTo('root'));

const foo = app.get('/foo');
foo.post('/bar').name('bar');
foo.get('/baz', {ext: 'html'});

app.start();
