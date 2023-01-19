import Users from './models/users.js';
import mojo from '../../../../lib/core.js';

export const app = mojo();

if (app.mode === 'development') app.log.level = 'debug';

app.config.name = 'Full';

app.models.users = new Users();

app.config.hooksCalled = [];
app.addAppHook('app:start', app => app.config.hooksCalled.push(`app:start: ${app.config.name}`));
app.addAppHook('app:stop', app => app.config.hooksCalled.push(`app:stop: ${app.config.name}`));
app.addAppHook('app:warmup', app => app.config.hooksCalled.push(`app:warmup: ${app.config.name}`));

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.any('/foo').to('foo#works');
app.any('/FOO').to('foo#works');

const bar = app.any('/bar').to('bar#');
bar.put('/').to('#jsonReturn');
bar.get('/:msg').to('#hello');

app.get('/foo/baz').to('foo/baz#test');

app.get('/variants').to('foo#variants');

const renderer = app.any('/renderer');
renderer.get('/hello/:name').to('foo#withView');
renderer.get('/hello/layout/:name').to('foo#withView', {layout: 'default'});
renderer.get('/inline/:name').to('foo#withInlineView');
renderer.put('/another.view').to('foo#anotherView');

app.get('/static').to(ctx => ctx.sendFile(ctx.home.child('public', 'test.txt')));

app.get('/default/view').to('foo#defaultView');

app.websocket('/echo.json').to('foo#websocket').name('websocket_echo');

app.get('/hooks').to('foo#hooks');

app.get('/session/login/:name').to('auth#login');
app.get('/session/logout').to('auth#logout');

app.get('/url').to('foo#url');

app.get('/not/found').to('foo#notFound');

app.start();
