import mojo from '../../../index.js';

export const app = mojo();

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

const foo = app.get('/foo');
foo.post('/bar').name('bar');
foo.get('/baz', {ext: 'html'});

app.start();
