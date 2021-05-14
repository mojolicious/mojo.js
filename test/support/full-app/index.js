import mojo from '../../../lib/mojo.js';
import Users from './models/users.js';

export const app = mojo();

app.config.name = 'Full';

app.models.users = new Users();

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.any('/foo').to('foo#works');
app.any('/FOO').to('foo#works');

const bar = app.any('/bar').to('bar#');
bar.put('/').to('#jsonReturn');
bar.get('/:msg').to('#hello');

app.get('/foo/baz').to('foo/baz#test');

const renderer = app.any('/renderer');
renderer.get('/hello/:name').to('foo#withView');
renderer.get('/inline/:name').to('foo#withInlineView');
renderer.put('/another.view').to('foo#anotherView');

app.get('/static').to(ctx => ctx.sendFile(ctx.home.child('public', 'test.txt').toString()));

app.start();
