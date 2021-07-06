import mojo from '../lib/core.js';
import {Server} from '../lib/server.js';
import Path from '@mojojs/path';
import t from 'tap';

t.test('HTTPS app', async t => {
  const app = mojo();

  if (app.mode === 'development') app.log.level = 'debug';

  app.get('/', ctx => ctx.render({text: `HTTPS: ${ctx.req.isSecure}`}));

  const cert = Path.currentFile().sibling('support', 'certs', 'server.crt').toString();
  const key = Path.currentFile().sibling('support', 'certs', 'server.key').toString();
  const server = new Server(app, {listen: [`https://127.0.0.1?cert=${cert}&key=${key}`], quiet: true});
  await server.start();
  const client = await app.newTestClient({tap: t});

  await t.test('HTTP', async () => {
    (await client.getOk('/')).statusIs(200).bodyIs('HTTPS: false');
  });

  client.baseURL = server.urls[0];

  await t.test('HTTPS (self signed cert is rejected by default)', async t => {
    let result;
    try {
      await client.get('/');
    } catch (error) {
      result = error;
    }
    t.equal(result.code, 'DEPTH_ZERO_SELF_SIGNED_CERT');
  });

  await t.test('HTTPS (self signed cert is accepted in insecure mode)', async () => {
    (await client.getOk('/', {insecure: true})).statusIs(200).bodyIs('HTTPS: true');
  });

  await server.stop();
  await client.stop();
});
