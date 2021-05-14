import File from '../lib/file.js';
import mojo from '../lib/mojo.js';
import Server from '../lib/server.js';
import t from 'tap';

t.test('HTTPS app', async t => {
  const app = mojo();

  app.get('/', ctx => ctx.render({text: `HTTPS: ${ctx.req.isSecure}`}));

  const cert = File.currentFile().sibling('support', 'certs', 'server.crt').toString();
  const key = File.currentFile().sibling('support', 'certs', 'server.key').toString();
  const server = new Server(app, {listen: [`https://127.0.0.1?cert=${cert}&key=${key}`], quiet: true});
  await server.start();
  const client = await app.newTestClient({tap: t});

  await t.test('HTTP', async t => {
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

  await t.test('HTTPS (self signed cert is accepted in insecure mode)', async t => {
    (await client.getOk('/', {insecure: true})).statusIs(200).bodyIs('HTTPS: true');
  });

  await server.stop();
  await client.stop();
});
