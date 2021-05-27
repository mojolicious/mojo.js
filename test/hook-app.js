import mojo from '../lib/mojo.js';
import t from 'tap';
import * as util from '../lib/util.js';

t.test('Hook app', async t => {
  const app = mojo();

  app.log.level = 'fatal';
  app.config.serverHooks = 'works';

  app.get('/', ctx => ctx.render({text: 'Hello Mojo!'}));

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

  t.same(serverHooks, ['start: works']);
  await client.stop();
  t.same(serverHooks, ['start: works', 'stop: works']);
});
