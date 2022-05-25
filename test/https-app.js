import mojo from '../lib/core.js';
import {Server} from '../lib/server.js';
import Path from '@mojojs/path';
import t from 'tap';

/*
 * To regenerate all required certificates run these commands (06.11.2021)
 *
 * openssl genrsa -out ca.key 4096
 * openssl req -new -sha256 -key ca.key -out ca.csr -subj "/C=US/CN=ca"
 * openssl req -x509 -days 7300 -sha256 -key ca.key -in ca.csr -out ca.crt
 *
 * openssl genrsa -out server.key 4096
 * openssl req -new -sha256 -key server.key -out server.csr -subj "/C=US/CN=localhost"
 * openssl x509 -req -days 7300 -sha256 -in server.csr -out server.crt -CA ca.crt -CAkey ca.key -CAcreateserial
 */
t.test('HTTPS app', async t => {
  const app = mojo();

  if (app.mode === 'development') app.log.level = 'debug';

  app.get('/', ctx => ctx.render({text: `HTTPS: ${ctx.req.isSecure}`}));

  const cert = Path.currentFile().sibling('support', 'certs', 'server.crt').toString();
  const key = Path.currentFile().sibling('support', 'certs', 'server.key').toString();
  const server = new Server(app, {listen: [`https://127.0.0.1?cert=${cert}&key=${key}`], quiet: true});
  await server.start();
  const ua = await app.newTestUserAgent({tap: t});

  await t.test('HTTP', async () => {
    (await ua.getOk('/')).statusIs(200).bodyIs('HTTPS: false');
  });

  ua.baseURL = server.urls[0];

  await t.test('HTTPS (self signed cert is rejected by default)', async t => {
    let result;
    try {
      await ua.get('/');
    } catch (error) {
      result = error;
    }
    t.equal(result.code, 'UNABLE_TO_VERIFY_LEAF_SIGNATURE');
  });

  await t.test('HTTPS (self signed cert is accepted in insecure mode)', async () => {
    (await ua.getOk('/', {insecure: true})).statusIs(200).bodyIs('HTTPS: true');
  });

  await t.test('HTTPS (self signed cert is accepted with custom ca cert and server name)', async () => {
    const ca = await Path.currentFile().sibling('support', 'certs', 'ca.crt').readFile();
    (await ua.getOk('/', {ca: [ca], servername: 'localhost'})).statusIs(200).bodyIs('HTTPS: true');
  });

  await server.stop();
  await ua.stop();

  await t.test('Built-in development certificate', async t => {
    const ua = await app.newTestUserAgent({tap: t}, {https: true});

    (await ua.getOk('/', {insecure: true})).statusIs(200).bodyIs('HTTPS: true');

    let result;
    try {
      await ua.get('/');
    } catch (error) {
      result = error;
    }
    t.equal(result.code, 'DEPTH_ZERO_SELF_SIGNED_CERT');

    await ua.stop();
  });
});
