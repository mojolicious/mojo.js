import mojo from '../lib/core.js';
import t from 'tap';

t.test('WebSocket app', async t => {
  const app = mojo();

  if (app.mode === 'development') app.log.level = 'debug';

  app.websocket('/echo').to(ctx => {
    const greeting = ctx.req.get('X-Greeting');
    ctx.on('connection', ws => {
      ws.on('message', message => {
        if (typeof message !== 'string') {
          ws.send(message);
        } else {
          ws.send(`echo: ${message}`);
        }
      });
      if (greeting) {
        ws.send(`greeting: ${greeting}`);
      }
    });
  });

  app.get('/echo').to(ctx => ctx.render({text: 'plain echo!'}));

  app.websocket('/echo.json').to(ctx => {
    ctx.json(async ws => {
      for await (const message of ws) {
        message.hello = message.hello + '!';
        ws.send(message);
      }
    });
  });

  app.websocket('/push').to(ctx => {
    ctx.on('connection', ws => {
      let i = 1;
      const timer = setInterval(() => ws.send(`push ${i++}`), 100);
      ws.on('close', () => clearInterval(timer));
    });
  });

  app.websocket('/close').to(ctx => {
    ctx.on('connection', ws => ws.close(1001));
  });

  app.websocket('/one_sided').to(ctx => {
    ctx.on('connection', ws => {
      ws.send('I ♥ Mojolicious!');
      ws.close();
    });
  });

  app.websocket('/rejected').to(ctx => {
    ctx.log.trace('Rejecting WebSocket');
  });

  app.post('/login', async ctx => {
    const session = await ctx.session();
    session.user = 'kraih';
    ctx.render({text: `Welcome ${session.user}`});
  });

  app.websocket('/restricted').to(async ctx => {
    const session = await ctx.session();
    ctx.on('connection', ws => {
      ws.send(`Welcome back ${session.user}`);
      ws.close();
    });
  });

  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Simple roundtrip', async t => {
    await ua.websocketOk('/echo');
    await ua.sendOk('hello');
    t.equal(await ua.messageOk(), 'echo: hello');
    await ua.closeOk(1000);
    await ua.closedOk(1000);
  });

  await t.test('JSON roundtrip', async t => {
    await ua.websocketOk('/echo.json', {json: true});
    await ua.sendOk({hello: 'world'});
    t.same(await ua.messageOk(), {hello: 'world!'});
    await ua.sendOk({hello: 'mojo'});
    t.same(await ua.messageOk(), {hello: 'mojo!'});
    await ua.closeOk(1000);
    await ua.closedOk(1000);
  });

  await t.test('Multiple roundtrips', async t => {
    await ua.websocketOk('/echo');
    await ua.sendOk('hello again');
    t.equal(await ua.messageOk(), 'echo: hello again');
    await ua.sendOk('and one more time');
    t.equal(await ua.messageOk(), 'echo: and one more time');
    await ua.closeOk(4000);
    await ua.closedOk(4000);
  });

  await t.test('Custom headers and protocols', async t => {
    await ua.websocketOk('/echo', {headers: {'X-Greeting': 'hello mojo'}, protocols: ['foo', 'bar', 'baz']});
    ua.headerIs('Upgrade', 'websocket').headerIs('Connection', 'Upgrade').headerIs('Sec-WebSocket-Protocol', 'foo');
    t.equal(await ua.messageOk(), 'greeting: hello mojo');
    await ua.sendOk('hello');
    t.equal(await ua.messageOk(), 'echo: hello');
    await ua.closeOk();
  });

  await t.test('Bytes', async t => {
    await ua.websocketOk('/echo');
    await ua.sendOk(Buffer.from('bytes!'));
    t.same(await ua.messageOk(), Buffer.from('bytes!'));
    await ua.closeOk();
  });

  await t.test('Zero', async t => {
    await ua.websocketOk('/echo');
    await ua.sendOk(0);
    t.equal(await ua.messageOk(), 'echo: 0');
    await ua.closeOk();
  });

  await t.test('Plain alternative', async () => {
    (await ua.getOk('/echo')).statusIs(200).bodyIs('plain echo!');
  });

  await t.test('Server push', async t => {
    await ua.websocketOk('/push');
    t.equal(await ua.messageOk(), 'push 1');
    t.equal(await ua.messageOk(), 'push 2');
    t.equal(await ua.messageOk(), 'push 3');
    await ua.closeOk();

    await ua.websocketOk('/push');
    t.equal(await ua.messageOk(), 'push 1');
    t.equal(await ua.messageOk(), 'push 2');
    t.equal(await ua.messageOk(), 'push 3');
    await ua.closeOk();
  });

  await t.test('WebSocket connection gets closed right away', async () => {
    await ua.websocketOk('/close');
    await ua.closedOk(1001);
  });

  await t.test('WebSocket connection gets closed after one message', async t => {
    await ua.websocketOk('/one_sided');
    t.equal(await ua.messageOk(), 'I ♥ Mojolicious!');
    await ua.closedOk(1005);
  });

  await t.test('Rejected WebSocket connection', async t => {
    let fail;
    try {
      await ua.websocketOk('/rejected');
    } catch (error) {
      fail = error;
    }
    t.match(fail, {code: 'ECONNRESET'});
  });

  await t.test('Session', async t => {
    await (await ua.postOk('/login')).statusIs(200).bodyIs('Welcome kraih');
    await ua.websocketOk('/restricted');
    t.equal(await ua.messageOk(), 'Welcome back kraih');
    await ua.closedOk(1005);
  });

  await ua.stop();
});
