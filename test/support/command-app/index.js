import mojo from '../../../lib/mojo.js';

export const app = mojo();

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'})).name('root');

app.post('/redirect', ctx => ctx.redirectTo('root'));

const foo = app.get('/foo');
foo.post('/bar').name('bar');
foo.get('/baz', {ext: 'html'});

app.start();
