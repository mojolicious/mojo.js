import mojo from '../../../index.js';

export const app = mojo();

app.models.test = {result: 'working'};

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.any('/foo').to('foo#works');

const bar = app.any('/bar').to('bar#');
bar.put('/').to('#jsonReturn');
bar.get('/:msg').to('#hello');

app.get('/foo/baz').to('foo/baz#test');

const renderer = app.any('/renderer');
renderer.get('/hello/:name').to('foo#withTemplate');
renderer.get('/inline/:name').to(ctx => ctx.render({inline: 'Hello <%= name %>'}));
renderer.put('/another.template').to(ctx => ctx.render({template: 'foo'}));

app.start();
