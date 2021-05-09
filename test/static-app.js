import {app} from './support/static-app/index.js';
import t from 'tap';

t.test('Static app', async t => {
  const client = await app.newTestClient({tap: t});

  await t.test('0', async t => {
    (await client.getOk('/public/0')).statusIs(200).headerIs('Content-Length', '1').bodyIs('0');
    (await client.getOk('/0')).statusIs(200).headerIs('Content-Length', '4').bodyIs('Zero');
    (await client.getOk('/public/../index.js')).statusIs(404);
  });

  await t.test('Bundled files', async t => {
    (await client.getOk('/public/mojo/bootstrap/bootstrap.bundle.min.js')).statusIs(200)
      .headerIs('Content-Type', 'application/javascript').headerExists('Content-Length');
    (await client.getOk('/public/mojo/bootstrap/bootstrap.min.css')).statusIs(200)
      .headerIs('Content-Type', 'text/css').headerExists('Content-Length');

    (await client.getOk('/public/mojo/failraptor.png')).statusIs(200)
      .headerIs('Content-Type', 'image/png').headerExists('Content-Length');
    (await client.getOk('/public/mojo/favicon.ico')).statusIs(200)
      .headerIs('Content-Type', 'image/x-icon').headerExists('Content-Length');
    (await client.getOk('/public/mojo/logo-white-2x.png')).statusIs(200)
      .headerIs('Content-Type', 'image/png').headerExists('Content-Length');
    (await client.getOk('/public/mojo/logo-white.png')).statusIs(200)
      .headerIs('Content-Type', 'image/png').headerExists('Content-Length');
    (await client.getOk('/public/mojo/mojo.css')).statusIs(200)
      .headerIs('Content-Type', 'text/css').headerExists('Content-Length');
    (await client.getOk('/public/mojo/no-raptor.png')).statusIs(200)
      .headerIs('Content-Type', 'image/png').headerExists('Content-Length');
    (await client.getOk('/public/mojo/not-found.png')).statusIs(200)
      .headerIs('Content-Type', 'image/png').headerExists('Content-Length');
    (await client.getOk('/public/mojo/pinstripe-dark.png')).statusIs(200)
      .headerIs('Content-Type', 'image/png').headerExists('Content-Length');
    (await client.getOk('/public/mojo/pinstripe-light.png')).statusIs(200)
      .headerIs('Content-Type', 'image/png').headerExists('Content-Length');
  });

  await client.stop();
});
