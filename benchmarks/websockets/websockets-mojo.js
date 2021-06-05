'use strict';

const app = require('../../lib/mojo')({mode: 'production'});

app.websocket('/ws').to(ctx => {
  ctx.on('connection', ws => {
    ws.on('message', message => {
      ws.send(message);
    });
  });
});

(async () => {
  const client = await app.newMockClient();

  const ws = await client.websocket('/ws');
  let i = 0;
  ws.on('message', message => {
    i++ > 100000 ? ws.close() : ws.send(message);
  });
  ws.send('Hello Mojo!');

  await client.stop();
})();
