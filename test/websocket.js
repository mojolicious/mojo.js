import mojo from '../lib/core.js';
import {sleep} from '../lib/util.js';
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

  app.websocket('/status').to(ctx => {
    const status = ctx.req.query.get('status') ?? '404';
    ctx.on('connection', ws => {
      ws.send(status);
    });
  });

  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Hello World', async () => {
    (await ua.getOk('/')).statusIs(200).bodyIs('Hello Mojo!');
  });

  await t.test('WebSocket roundtrip', async t => {
    const ws = await ua.websocket('/ws');
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
    const ws = await ua.websocket('/ws');
    ws.send('Hello Mojo!');
    let result;
    for await (const message of ws) {
      result = message;
      ws.close();
    }
    t.equal(result, 'Hello Mojo!');
  });

  await t.test('WebSocket roundtrip (server iterator)', async t => {
    const ws = await ua.websocket('/ws/iterator');
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
    const ws = await ua.websocket('/ws/json', {json: true});
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
    const ws = await ua.websocket('/ping');
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

  await t.test('Hooks', async t => {
    ua.addHook('websocket', async (ua, config) => {
      await sleep(10);
      config.url.searchParams.append('status', 201);
    });
    const ws = await ua.websocket('/status');
    let result;
    for await (const message of ws) {
      result = message;
      ws.close();
    }
    t.equal(result, '201');
  });

  await ua.stop();
});
