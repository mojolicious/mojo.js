import mojo from '../../../index.js';

export const app = mojo();

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.any('/foo').to('foo#works');

const bar = app.any('/bar').to('bar#');
bar.put('/').to('#jsonReturn');
bar.get('/:msg').to('#hello');

app.get('/foo/baz').to('foo/baz#test');

app.start();
