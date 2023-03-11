import {Stream} from 'node:stream';
import mojo from '../lib/core.js';
import {Server} from '../lib/server.js';
import t from 'tap';

t.test('Proxy app', async t => {
  const proxyApp = mojo();
  const targetApp = mojo();

  proxyApp.log.level = 'fatal';
  targetApp.log.level = 'fatal';

  const server = new Server(targetApp, {listen: ['http://127.0.0.1'], quiet: true});
  await server.start();
  const prefix = server.urls[0];

  proxyApp.get('/proxy1/*target', async ctx => {
    return ctx.proxyGet(`${prefix}${ctx.stash.target}`).catch(async error => {
      await ctx.render({text: `Error: ${error}`});
    });
  });

  proxyApp.patch('/proxy2/*target', async ctx => {
    return ctx.proxyPost(`${prefix}${ctx.stash.target}`, {headers: {'X-Mojo-More': 'Less'}, body: 'Hello!'});
  });

  proxyApp.get('/proxy3/:method/*target', async ctx => {
    const {method, target} = ctx.stash;
    await ctx.proxyRequest({method, url: `${prefix}${target}`});
    ctx.res.headers.remove('X-Mojo-App').set('X-Mojo-Proxy1', 'just').set('X-Mojo-Proxy2', 'works!');
  });

  targetApp.get('/res1', async ctx => {
    ctx.res.set('X-Mojo-App', 'One').send('One!');
  });

  targetApp.get('/res2', async ctx => {
    await ctx.res.set('X-Mojo-App', 'Two').send(Stream.Readable.from(['Tw', 'o!']));
  });

  targetApp.any('/res3', async ctx => {
    const body = await ctx.req.text();
    ctx.res
      .set('Transfer-Encoding', 'chunked')
      .set('X-Mojo-App', 'Three')
      .set('X-Mojo-Method', ctx.req.method)
      .set('X-Mojo-More', ctx.req.get('X-Mojo-More') ?? '')
      .set('X-Mojo-Body', body.length);
    await ctx.res.send(Stream.Readable.from(['Th', 'ree!']));
  });

  targetApp.get('/res4', ctx => {
    ctx.res.set('X-Mojo-App', 'Four');
    return ctx.render({text: '', status: 204});
  });

  targetApp.get('/res5', async ctx => {
    await ctx.backend.req.socket.end('');
  });

  targetApp.get('/res6', async ctx => {
    await ctx.render({text: 'x'.repeat(2048)});
  });

  const ua = await proxyApp.newTestUserAgent({tap: t});

  await t.test('Various response variants', async () => {
    (await ua.getOk('/proxy1/res1')).statusIs(200).headerIs('X-Mojo-App', 'One').bodyIs('One!');
    (await ua.getOk('/proxy1/res2')).statusIs(200).headerIs('X-Mojo-App', 'Two').bodyIs('Two!');
    (await ua.getOk('/proxy1/res3'))
      .statusIs(200)
      .headerIs('X-Mojo-App', 'Three')
      .headerIs('X-Mojo-Method', 'GET')
      .headerIs('X-Mojo-More', '')
      .headerIs('X-Mojo-Body', '0')
      .bodyIs('Three!');
    (await ua.getOk('/proxy1/res4')).statusIs(204).headerIs('X-Mojo-App', 'Four').bodyIs('');
    (await ua.getOk('/proxy1/res5')).statusIs(200).bodyLike(/Error: .+/);
    (await ua.getOk('/proxy1/res6')).statusIs(200).bodyIs('x'.repeat(2048));
  });

  await t.test('Custom request', async () => {
    (await ua.patchOk('/proxy2/res3'))
      .statusIs(200)
      .headerIs('X-Mojo-App', 'Three')
      .headerIs('X-Mojo-Method', 'POST')
      .headerIs('X-Mojo-More', 'Less')
      .headerIs('X-Mojo-Body', '6')
      .bodyIs('Three!');
  });

  await t.test('Response modification', async () => {
    (await ua.getOk('/proxy3/GET/res1'))
      .statusIs(200)
      .headerExistsNot('X-Mojo-App')
      .headerIs('X-Mojo-Proxy1', 'just')
      .headerIs('X-Mojo-Proxy2', 'works!')
      .bodyIs('One!');
    (await ua.getOk('/proxy3/POST/res3'))
      .statusIs(200)
      .headerIs('X-Mojo-Method', 'POST')
      .headerExistsNot('X-Mojo-App')
      .headerIs('X-Mojo-Proxy1', 'just')
      .headerIs('X-Mojo-Proxy2', 'works!')
      .bodyIs('Three!');
  });

  await server.stop();
  await ua.stop();
});
