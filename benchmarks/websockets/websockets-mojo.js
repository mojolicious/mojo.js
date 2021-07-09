import mojo from '../../lib/core.js';

const app = mojo();

app.websocket('/ws').to(ctx => {
  ctx.on('connection', ws => {
    ws.on('message', message => {
      ws.send(message);
    });
  });
});

const ua = await app.newMockUserAgent();

const ws = await ua.websocket('/ws');
let i = 0;
ws.on('message', message => {
  i++ > 100000 ? ws.close() : ws.send(message);
});
ws.send('Hello Mojo!');

await ua.stop();
