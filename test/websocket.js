import mojo from '../lib/mojo.js';
import t from 'tap';

t.test('WebSocket', async t => {
  const app = mojo();

  app.get('/').to(ctx => ctx.render({text: 'Hello Mojo!'}));

  app.websocket('/ws').to(ctx => {
    ctx.on('connection', ws => {
      ws.on('message', message => {
        ws.send(message);
      });
    });
  });

  const client = await app.newTestClient({tap: t});

  await t.test('Hello World', async t => {
    (await client.getOk('/')).statusIs(200).bodyIs('Hello Mojo!');
  });

  await t.test('WebSocket roundtrip', async t => {
    const ws = await client.websocket('/ws');
    ws.on('open', () => {
      ws.send('Hello Mojo!');
    });
    const message = await new Promise(resolve => {
      ws.on('message', data => {
        ws.on('close', () => resolve(data));
        ws.close();
      });
    });
    t.equal(message, 'Hello Mojo!');
  });

  await client.stop();
});
