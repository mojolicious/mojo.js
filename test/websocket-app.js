import mojo from '../lib/mojo.js';
import t from 'tap';

t.test('WebSocket app', async t => {
  const app = mojo();

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
      ws.send('I ♥ Mojolicious!', () => ws.close());
    });
  });

  const client = await app.newTestClient({tap: t});

  await t.test('Simple roundtrip', async t => {
    await client.websocketOk('/echo');
    await client.sendOk('hello');
    t.equal(await client.messageOk(), 'echo: hello');
    await client.finishOk(1000);
    await client.finishedOk(1000);
  });

  await t.test('Multiple roundtrips', async t => {
    await client.websocketOk('/echo');
    await client.sendOk('hello again');
    t.equal(await client.messageOk(), 'echo: hello again');
    await client.sendOk('and one more time');
    t.equal(await client.messageOk(), 'echo: and one more time');
    await client.finishOk(4000);
    await client.finishedOk(4000);
  });

  await t.test('Custom headers and protocols', async t => {
    const headers = {'X-Greeting': 'hello mojo'};
    await client.websocketOk('/echo', {headers, protocols: ['foo', 'bar', 'baz']});
    client.headerIs('Upgrade', 'websocket').headerIs('Connection', 'Upgrade').headerIs('Sec-WebSocket-Protocol', 'foo');
    t.equal(await client.messageOk(), 'greeting: hello mojo');
    await client.sendOk('hello');
    t.equal(await client.messageOk(), 'echo: hello');
    await client.finishOk();
  });

  await t.test('Bytes', async t => {
    await client.websocketOk('/echo');
    await client.sendOk(Buffer.from('bytes!'));
    t.same(await client.messageOk(), Buffer.from('bytes!'));
    await client.finishOk();
  });

  await t.test('Zero', async t => {
    await client.websocketOk('/echo');
    await client.sendOk(0);
    t.equal(await client.messageOk(), 'echo: 0');
    await client.finishOk();
  });

  await t.test('Plain alternative', async t => {
    (await client.getOk('/echo')).statusIs(200).bodyIs('plain echo!');
  });

  await t.test('Server push', async t => {
    await client.websocketOk('/push');
    t.equal(await client.messageOk(), 'push 1');
    t.equal(await client.messageOk(), 'push 2');
    t.equal(await client.messageOk(), 'push 3');
    await client.finishOk();

    await client.websocketOk('/push');
    t.equal(await client.messageOk(), 'push 1');
    t.equal(await client.messageOk(), 'push 2');
    t.equal(await client.messageOk(), 'push 3');
    await client.finishOk();
  });

  await t.test('WebSocket connection gets closed right away', async t => {
    await client.websocketOk('/close');
    await client.finishedOk(1001);
  });

  await t.test('WebSocket connection gets closed after one message', async t => {
    await client.websocketOk('/one_sided');
    t.equal(await client.messageOk(), 'I ♥ Mojolicious!');
    await client.finishedOk(1005);
  });

  await client.stop();
});
