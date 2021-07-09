import Stream from 'stream';
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
  app.addAppHook('start', async app => {
    await util.sleep(1);
    serverHooks.push(`start: ${app.config.serverHooks}`);
  });
  app.addAppHook('stop', async app => {
    await util.sleep(1);
    serverHooks.push(`stop: ${app.config.serverHooks}`);
  });

  app.addContextHook('request', async ctx => {
    const first = ctx.req.query.get('first');
    if (first !== '1') return;
    await util.sleep(1);
    await ctx.render({text: 'First request hook'});
    return true;
  });

  app.addContextHook('request', ctx => {
    ctx.res.set('X-Hook', 'works');
  });

  app.addContextHook('request', async ctx => {
    const second = ctx.req.query.get('second');
    if (second !== '1') return;
    await ctx.render({text: 'Second request hook'});
    return true;
  });

  app.addContextHook('websocket', async ctx => {
    const third = ctx.req.query.get('third');
    if (third !== '1') return;
    ctx.on('connection', ws => {
      ws.send('Hello World!');
      ws.close();
    });
    await util.sleep(1);
    return true;
  });

  app.addContextHook('send', async ctx => {
    const params = await ctx.params();
    if (params.get('powered') === '1') ctx.res.set('X-Powered-By', 'mojo.js');
  });

  app.addContextHook('send', async (ctx, body) => {
    if (typeof body !== 'object' || Buffer.isBuffer(body) || body instanceof Stream) return;

    const res = ctx.res;
    const raw = res.raw;

    const json = JSON.stringify(body);
    res.type('application/json').length(Buffer.byteLength(json));
    raw.writeHead(res.statusCode, res.headers);
    raw.end(json);

    return true;
  });

  app.websocket('/hello').to(ctx => {
    ctx.on('connection', ws => {
      ws.send('Hello Mojo!');
      ws.close();
    });
  });

  app.addContextHook('request', async ctx => {
    await util.sleep(1);
    const exception = ctx.req.query.get('exception');
    if (exception !== '1') return;
    throw new Error('Hook exception');
  });

  app.addContextHook('static', async ctx => {
    const params = await ctx.params();
    if (params.get('cache') === '1') ctx.res.set('Cache-Control', 'public, max-age=604800, immutable');
  });

  app.addContextHook('static', async (ctx, file) => {
    const params = await ctx.params();
    if (!params.has('hijack')) return;

    ctx.res.send(`Hijacked: ${file.basename()}`);
    return true;
  });

  t.same(serverHooks, []);
  const ua = await app.newTestUserAgent({tap: t});
  t.same(serverHooks, ['start: works']);

  await t.test('Request hooks', async () => {
    (await ua.getOk('/')).statusIs(200).headerIs('X-Hook', 'works').bodyIs('Hello Mojo!');
    (await ua.getOk('/?first=1')).statusIs(200).headerExistsNot('X-Hook').bodyIs('First request hook');
    (await ua.getOk('/?second=1')).statusIs(200).headerIs('X-Hook', 'works').bodyIs('Second request hook');
    (await ua.getOk('/whatever?second=1')).statusIs(200).headerIs('X-Hook', 'works').bodyIs('Second request hook');
    (await ua.getOk('/whatever')).statusIs(404);
  });

  await t.test('WebSocket hooks', async t => {
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

  await t.test('Request hook exception', async () => {
    (await ua.getOk('/?exception=1')).statusIs(500).headerIs('X-Hook', 'works').bodyLike(/Error: Hook exception/);
  });

  await t.test('Send hooks', async () => {
    (await ua.getOk('/send?powered=1')).statusIs(200).typeIs('application/json').headerExists('Content-Length')
      .headerIs('X-Powered-By', 'mojo.js').jsonIs({hello: 'world'});
    (await ua.getOk('/send?powered=0')).statusIs(200).typeIs('application/json').headerExists('Content-Length')
      .headerExistsNot('X-Powered-By').jsonIs({hello: 'world'});
  });

  await t.test('Static hooks', async () => {
    (await ua.getOk('/public/mojo/favicon.ico?cache=1')).statusIs(200).typeIs('image/vnd.microsoft.icon')
      .headerExists('Content-Length').headerIs('Cache-Control', 'public, max-age=604800, immutable');
    (await ua.getOk('/public/mojo/favicon.ico?cache=0')).statusIs(200).typeIs('image/vnd.microsoft.icon')
      .headerExists('Content-Length').headerExistsNot('Cache-Control');

    (await ua.getOk('/public/mojo/favicon.ico?cache=1&hijack=1')).statusIs(200).headerExists('Content-Length')
      .headerIs('Cache-Control', 'public, max-age=604800, immutable').bodyIs('Hijacked: favicon.ico');

    (await ua.getOk('/public/mojo/favicon.ico?cache=1&hijack=1&powered=1')).statusIs(200)
      .headerExists('Content-Length').headerIs('Cache-Control', 'public, max-age=604800, immutable')
      .headerIs('X-Powered-By', 'mojo.js').bodyIs('Hijacked: favicon.ico');
  });

  t.same(serverHooks, ['start: works']);
  await ua.stop();
  t.same(serverHooks, ['start: works', 'stop: works']);
});
