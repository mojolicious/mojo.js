import mojo from '../lib/mojo.js';
import t from 'tap';

t.test('WebSocket', async t => {
  const app = mojo();

  if (app.mode === 'development') app.log.level = 'debug';

  app.config.ping = null;

  app.get('/').to(ctx => ctx.render({text: 'Hello Mojo!'}));

  app.websocket('/ws').to(ctx => {
    ctx.on('connection', ws => {
      ws.on('message', message => {
        ws.send(message);
      });
    });
  });

  app.websocket('/ws/iterator').to(ctx => {
    ctx.plain(async ws => {
      for await (const message of ws) {
        ws.send(message);
      }
    });
  });

  app.websocket('/ws/json').to(ctx => {
    ctx.json(async ws => {
      for await (const message of ws) {
        ws.send(message);
      }
    });
  });

  app.websocket('/ping').to(ctx => {
    ctx.plain(ws => {
      ws.on('ping', data => {
        ctx.config.ping = data.toString();
      });
    });
  });

  const client = await app.newTestClient({tap: t});

  await t.test('Hello World', async t => {
    (await client.getOk('/')).statusIs(200).bodyIs('Hello Mojo!');
  });

  await t.test('WebSocket roundtrip', async t => {
    const ws = await client.websocket('/ws');
    await ws.send('Hello Mojo!');
    const message = await new Promise(resolve => {
      ws.on('message', message => {
        ws.on('close', () => resolve(message));
        ws.close();
      });
    });
    t.equal(message, 'Hello Mojo!');
    t.same(ws.jsonMode, false);
  });

  await t.test('WebSocket roundtrip (client iterator)', async t => {
    const ws = await client.websocket('/ws');
    ws.send('Hello Mojo!');
    let result;
    for await (const message of ws) {
      result = message;
      ws.close();
    }
    t.equal(result, 'Hello Mojo!');
  });

  await t.test('WebSocket roundtrip (server iterator)', async t => {
    const ws = await client.websocket('/ws/iterator');
    ws.send('Hello Mojo!');
    const message = await new Promise(resolve => {
      ws.on('message', message => {
        ws.on('close', () => resolve(message));
        ws.close();
      });
    });
    t.equal(message, 'Hello Mojo!');
  });

  await t.test('WebSocket roundtrip (JSON)', async t => {
    const ws = await client.websocket('/ws/json', {json: true});
    ws.send({hello: 'world'});
    let result;
    for await (const message of ws) {
      result = message;
      ws.close();
    }
    t.same(result, {hello: 'world'});
    t.same(ws.jsonMode, true);
  });

  await t.test('Ping/Pong', async t => {
    t.same(app.config.ping, null);
    const ws = await client.websocket('/ping');
    await ws.ping(Buffer.from('Hello Mojo!'));
    const data = await new Promise(resolve => {
      ws.on('pong', data => {
        ws.on('close', () => resolve(data));
        ws.close();
      });
    });
    t.equal(data.toString(), 'Hello Mojo!');
    t.same(app.config.ping, 'Hello Mojo!');
  });

  await client.stop();
});
