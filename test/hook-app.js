import mojo from '../lib/mojo.js';
import Stream from 'stream';
import t from 'tap';
import * as util from '../lib/util.js';

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
  app.addHook('start', async app => {
    await util.sleep(1);
    serverHooks.push(`start: ${app.config.serverHooks}`);
  });
  app.addHook('stop', async app => {
    await util.sleep(1);
    serverHooks.push(`stop: ${app.config.serverHooks}`);
  });

  app.addHook('request', async ctx => {
    const first = ctx.req.query.get('first');
    if (first !== '1') return;
    await util.sleep(1);
    await ctx.render({text: 'First request hook'});
    return true;
  });

  app.addHook('request', ctx => {
    ctx.res.set('X-Hook', 'works');
  });

  app.addHook('request', async ctx => {
    const second = ctx.req.query.get('second');
    if (second !== '1') return;
    await ctx.render({text: 'Second request hook'});
    return true;
  });

  app.addHook('websocket', async ctx => {
    const third = ctx.req.query.get('third');
    if (third !== '1') return;
    ctx.on('connection', ws => {
      ws.send('Hello World!');
      ws.close();
    });
    await util.sleep(1);
    return true;
  });

  app.addHook('send', async ctx => {
    const params = await ctx.params();
    if (params.get('powered') === '1') ctx.res.set('X-Powered-By', 'mojo.js');
  });

  app.addHook('send', async (ctx, body) => {
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

  app.addHook('request', async ctx => {
    await util.sleep(1);
    const exception = ctx.req.query.get('exception');
    if (exception !== '1') return;
    throw new Error('Hook exception');
  });

  app.addHook('static', async ctx => {
    const params = await ctx.params();
    if (params.get('cache') === '1') ctx.res.set('Cache-Control', 'public, max-age=604800, immutable');
  });

  app.addHook('static', async (ctx, file) => {
    const params = await ctx.params();
    if (!params.has('hijack')) return;

    ctx.res.send(`Hijacked: ${file.basename()}`);
    return true;
  });

  t.same(serverHooks, []);
  const client = await app.newTestClient({tap: t});
  t.same(serverHooks, ['start: works']);

  await t.test('Request hooks', async t => {
    (await client.getOk('/')).statusIs(200).headerIs('X-Hook', 'works').bodyIs('Hello Mojo!');
    (await client.getOk('/?first=1')).statusIs(200).headerExistsNot('X-Hook').bodyIs('First request hook');
    (await client.getOk('/?second=1')).statusIs(200).headerIs('X-Hook', 'works').bodyIs('Second request hook');
    (await client.getOk('/whatever?second=1')).statusIs(200).headerIs('X-Hook', 'works').bodyIs('Second request hook');
    (await client.getOk('/whatever')).statusIs(404);
  });

  await t.test('WebSocket hooks', async t => {
    await client.websocketOk('/hello');
    t.equal(await client.messageOk(), 'Hello Mojo!');
    await client.finishedOk(1005);

    await client.websocketOk('/hello?third=1');
    t.equal(await client.messageOk(), 'Hello World!');
    await client.finishedOk(1005);

    await client.websocketOk('/whatever?third=1');
    t.equal(await client.messageOk(), 'Hello World!');
    await client.finishedOk(1005);
  });

  await t.test('Request hook exception', async t => {
    (await client.getOk('/?exception=1')).statusIs(500).headerIs('X-Hook', 'works').bodyLike(/Error: Hook exception/);
  });

  await t.test('Send hooks', async t => {
    (await client.getOk('/send?powered=1')).statusIs(200).typeIs('application/json').headerExists('Content-Length')
      .headerIs('X-Powered-By', 'mojo.js').jsonIs({hello: 'world'});
    (await client.getOk('/send?powered=0')).statusIs(200).typeIs('application/json').headerExists('Content-Length')
      .headerExistsNot('X-Powered-By').jsonIs({hello: 'world'});
  });

  await t.test('Static hooks', async t => {
    (await client.getOk('/public/mojo/favicon.ico?cache=1')).statusIs(200).typeIs('image/vnd.microsoft.icon')
      .headerExists('Content-Length').headerIs('Cache-Control', 'public, max-age=604800, immutable');
    (await client.getOk('/public/mojo/favicon.ico?cache=0')).statusIs(200).typeIs('image/vnd.microsoft.icon')
      .headerExists('Content-Length').headerExistsNot('Cache-Control');

    (await client.getOk('/public/mojo/favicon.ico?cache=1&hijack=1')).statusIs(200).headerExists('Content-Length')
      .headerIs('Cache-Control', 'public, max-age=604800, immutable').bodyIs('Hijacked: favicon.ico');

    (await client.getOk('/public/mojo/favicon.ico?cache=1&hijack=1&powered=1')).statusIs(200)
      .headerExists('Content-Length').headerIs('Cache-Control', 'public, max-age=604800, immutable')
      .headerIs('X-Powered-By', 'mojo.js').bodyIs('Hijacked: favicon.ico');
  });

  t.same(serverHooks, ['start: works']);
  await client.stop();
  t.same(serverHooks, ['start: works', 'stop: works']);
});
