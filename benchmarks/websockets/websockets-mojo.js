import mojo from '../../lib/mojo.js';

const app = mojo();

app.websocket('/ws').to(ctx => {
  ctx.on('connection', ws => {
    ws.on('message', message => {
      ws.send(message);
    });
  });
});

const client = await app.newMockClient();

const ws = await client.websocket('/ws');
let i = 0;
ws.on('message', message => {
  i++ > 100000 ? ws.close() : ws.send(message);
});
ws.send('Hello Mojo!');

await client.stop();
