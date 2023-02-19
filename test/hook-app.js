import Stream from 'node:stream';
import mojo from '../lib/core.js';
import * as util from '../lib/util.js';
import t from 'tap';

t.test('Hook app', async t => {
  const app = mojo();

  t.equal(app.log.level, 'trace');
  app.log.level = 'fatal';

  app.config.serverHooks = 'works';

  app.get('/', ctx => ctx.render({text: 'Hello Mojo!'}));

  app.get('/send', async ctx => {
    await ctx.res.send({hello: 'world'});
  });

  const serverHooks = [];
  app.addAppHook('server:start', async app => {
    await util.sleep(1);
    serverHooks.push(`server:start: ${app.config.serverHooks}`);
  });
  app.addAppHook('server:stop', async app => {
    await util.sleep(1);
    serverHooks.push(`server:stop: ${app.config.serverHooks}`);
  });

  app.onStart(async app => {
    await util.sleep(1);
    serverHooks.push(`app:start: ${app.config.serverHooks}`);
  });
  app.onStop(async app => {
    await util.sleep(1);
    serverHooks.push(`app:stop: ${app.config.serverHooks}`);
  });
  app.addAppHook('app:warmup', async app => {
    await util.sleep(1);
    serverHooks.push(`app:warmup: ${app.config.serverHooks}`);
  });

  app.addContextHook('dispatch:before', async ctx => {
    const first = ctx.req.query.get('first');
    if (first !== '1') return;
    await util.sleep(1);
    await ctx.render({text: 'First hook'});
    return true;
  });

  app.addContextHook('dispatch:before', ctx => {
    ctx.res.set('X-Hook', 'works');
  });

  app.addContextHook('dispatch:before', async ctx => {
    const second = ctx.req.query.get('second');
    if (second !== '1') return;
    await ctx.render({text: 'Second hook'});
    return true;
  });

  app.addContextHook('dispatch:before', async ctx => {
    const {name, req, res} = ctx.backend;
    const middleware = ctx.req.query.get('middleware');
    if (name !== 'server' || middleware !== '1') return;
    res.writeHead(200, ['X-URL', req.url]);
    res.end('Hello Middleware!');
    return true;
  });

  app.addContextHook('dispatch:before', async ctx => {
    if (ctx.isWebSocket === false) return;

    const third = ctx.req.query.get('third');
    if (third !== '1') return;
    ctx.on('connection', ws => {
      ws.send('Hello World!');
      ws.close();
    });
    await util.sleep(1);
    return true;
  });

  app.addContextHook('router:before', async ctx => {
    const fourth = ctx.req.query.get('fourth');
    if (fourth !== '1') return;
    await util.sleep(1);
    await ctx.render({text: 'Fourth hook'});
    return true;
  });

  app.addContextHook('render:before', async (ctx, options) => {
    const render = ctx.req.query.get('render');
    if (render !== '1') return;
    options.text += ' Works!';
  });

  app.addContextHook('send:before', async ctx => {
    const params = await ctx.params();
    if (params.get('powered') === '1') ctx.res.set('X-Powered-By', 'mojo.js');
  });

  app.addContextHook('send:before', async (ctx, body) => {
    if (typeof body !== 'object' || Buffer.isBuffer(body) || body instanceof Stream) return;

    const json = JSON.stringify(body);
    ctx.res.type('application/json').length(Buffer.byteLength(json));
    return json;
  });

  app.websocket('/hello').to(ctx => {
    ctx.on('connection', ws => {
      ws.send('Hello Mojo!');
      ws.close();
    });
  });

  app.addContextHook('dispatch:before', async ctx => {
    await util.sleep(1);
    const exception = ctx.req.query.get('exception');
    if (exception !== '1') return;
    throw new Error('Hook exception');
  });

  app.addContextHook('static:before', async ctx => {
    const params = await ctx.params();
    if (params.get('cache') === '1') ctx.res.set('Cache-Control', 'public, max-age=604800, immutable');
  });

  app.addContextHook('static:before', async (ctx, file) => {
    const params = await ctx.params();
    if (params.has('hijack') === false) return;

    ctx.res.send(`Hijacked: ${file.basename()}`);
    return true;
  });

  t.same(serverHooks, []);
  const ua = await app.newTestUserAgent({tap: t});
  t.same(serverHooks, ['server:start: works', 'app:start: works', 'app:warmup: works']);

  await t.test('Dispatch hooks (HTTP)', async () => {
    (await ua.getOk('/')).statusIs(200).headerIs('X-Hook', 'works').bodyIs('Hello Mojo!');
    (await ua.getOk('/?first=1')).statusIs(200).headerExistsNot('X-Hook').bodyIs('First hook');
    (await ua.getOk('/?second=1')).statusIs(200).headerIs('X-Hook', 'works').bodyIs('Second hook');
    (await ua.getOk('/whatever?second=1')).statusIs(200).headerIs('X-Hook', 'works').bodyIs('Second hook');
    (await ua.getOk('/whatever')).statusIs(404);
  });

  await t.test('Dispatch hooks (WebSocket)', async t => {
    await ua.websocketOk('/hello');
    t.equal(await ua.messageOk(), 'Hello Mojo!');
    await ua.closedOk(1005);

    await ua.websocketOk('/hello?third=1');
    t.equal(await ua.messageOk(), 'Hello World!');
    await ua.closedOk(1005);

    await ua.websocketOk('/whatever?third=1');
    t.equal(await ua.messageOk(), 'Hello World!');
    await ua.closedOk(1005);
  });

  await t.test('Dispatch hook exception', async () => {
    (await ua.getOk('/?exception=1'))
      .statusIs(500)
      .headerIs('X-Hook', 'works')
      .bodyLike(/Error: Hook exception/);
  });

  await t.test('Router hooks', async () => {
    (await ua.getOk('/')).statusIs(200).bodyIs('Hello Mojo!');
    (await ua.getOk('/?fourth=1')).statusIs(200).bodyIs('Fourth hook');
    (await ua.getOk('/static/mojo/favicon.ico?fourth=1')).statusIs(200).bodyIsnt('Fourth hook');
  });

  await t.test('Render hooks', async () => {
    (await ua.getOk('/')).statusIs(200).bodyIs('Hello Mojo!');
    (await ua.getOk('/?render=1')).statusIs(200).bodyIs('Hello Mojo! Works!');
  });

  await t.test('Server request hook', async () => {
    (await ua.getOk('/')).statusIs(200).bodyIs('Hello Mojo!');
    (await ua.getOk('/?middleware=1')).statusIs(200).headerIs('X-URL', '/?middleware=1').bodyIs('Hello Middleware!');
  });

  await t.test('Send hooks', async () => {
    (await ua.getOk('/send?powered=1'))
      .statusIs(200)
      .typeIs('application/json')
      .headerExists('Content-Length')
      .headerIs('X-Powered-By', 'mojo.js')
      .jsonIs({hello: 'world'});
    (await ua.getOk('/send?powered=0'))
      .statusIs(200)
      .typeIs('application/json')
      .headerExists('Content-Length')
      .headerExistsNot('X-Powered-By')
      .jsonIs({hello: 'world'});
  });

  await t.test('Static hooks', async () => {
    (await ua.getOk('/static/mojo/favicon.ico?cache=1'))
      .statusIs(200)
      .typeIs('image/vnd.microsoft.icon')
      .headerExists('Content-Length')
      .headerIs('Cache-Control', 'public, max-age=604800, immutable');
    (await ua.getOk('/static/mojo/favicon.ico?cache=0'))
      .statusIs(200)
      .typeIs('image/vnd.microsoft.icon')
      .headerExists('Content-Length')
      .headerExistsNot('Cache-Control');

    (await ua.getOk('/static/mojo/favicon.ico?cache=1&hijack=1'))
      .statusIs(200)
      .headerExists('Content-Length')
      .headerIs('Cache-Control', 'public, max-age=604800, immutable')
      .bodyIs('Hijacked: favicon.ico');

    (await ua.getOk('/static/mojo/favicon.ico?cache=1&hijack=1&powered=1'))
      .statusIs(200)
      .headerExists('Content-Length')
      .headerIs('Cache-Control', 'public, max-age=604800, immutable')
      .headerIs('X-Powered-By', 'mojo.js')
      .bodyIs('Hijacked: favicon.ico');
  });

  t.same(serverHooks, ['server:start: works', 'app:start: works', 'app:warmup: works']);
  await ua.stop();
  t.same(serverHooks, [
    'server:start: works',
    'app:start: works',
    'app:warmup: works',
    'server:stop: works',
    'app:stop: works'
  ]);
});
