import {app} from './support/static-app/index.js';
import t from 'tap';

t.test('Static app', async t => {
  const client = await app.newTestClient({tap: t});

  await t.test('0', async t => {
    (await client.getOk('/public/0')).statusIs(200).headerIs('Content-Length', '1').bodyIs('0');
    (await client.getOk('/0')).statusIs(200).headerIs('Content-Length', '4').bodyIs('Zero');
    (await client.getOk('/public/../lib/mojo.js')).statusIs(404);
  });

  await t.test('Range', async t => {
    (await client.getOk('/public/empty.txt')).statusIs(200).headerIs('Content-Type', 'text/plain;charset=UTF-8')
      .headerIs('Content-Length', '0').headerIs('Accept-Ranges', 'bytes').bodyIs('');
    (await client.getOk('/public/empty.txt', {headers: {Range: 'bytes=1-5'}})).statusIs(416).bodyIs('');

    (await client.getOk('/public/hello.txt')).statusIs(200).headerExists('Content-Type').headerExists('Content-Length')
      .headerIs('Accept-Ranges', 'bytes').bodyLike(/^Hello World!/);

    (await client.getOk('/public/hello.txt', {headers: {Range: 'bytes=1-5'}})).statusIs(200)
      .headerExists('Content-Type').headerExists('Content-Length').headerIs('Accept-Ranges', 'bytes')
      .headerLike('Content-Range', /^bytes 1-5\/\d+/).bodyIs('ello ');
    (await client.getOk('/public/hello.txt', {headers: {Range: 'bytes=-5'}})).statusIs(200)
      .headerExists('Content-Type').headerExists('Content-Length').headerIs('Accept-Ranges', 'bytes')
      .headerLike('Content-Range', /^bytes 0-5\/\d+/).bodyIs('Hello ');
    (await client.getOk('/public/hello.txt', {headers: {Range: 'bytes=1-'}})).statusIs(200)
      .headerExists('Content-Type').headerExists('Content-Length').headerIs('Accept-Ranges', 'bytes')
      .headerLike('Content-Range', /^bytes 1-\d+\/\d+/).bodyLike(/^ello World!/);
    (await client.getOk('/public/hello.txt', {headers: {Range: 'bytes=4-'}})).statusIs(200)
      .headerExists('Content-Type').headerExists('Content-Length').headerIs('Accept-Ranges', 'bytes')
      .headerLike('Content-Range', /^bytes 4-\d+\/\d+/).bodyLike(/^o World!/);
    (await client.getOk('/public/hello.txt', {headers: {Range: 'bytes=4-4'}})).statusIs(200)
      .headerExists('Content-Type').headerExists('Content-Length').headerIs('Accept-Ranges', 'bytes')
      .headerLike('Content-Range', /^bytes 4-4\/\d+/).bodyIs('o');
    (await client.getOk('/public/hello.txt', {headers: {Range: 'bytes=0-0'}})).statusIs(200)
      .headerExists('Content-Type').headerExists('Content-Length').headerIs('Accept-Ranges', 'bytes')
      .headerLike('Content-Range', /^bytes 0-\d+\/\d+/).bodyLike(/^Hello World!/);
    (await client.getOk('/public/hello.txt', {headers: {Range: 'bytes=-'}})).statusIs(200)
      .headerExists('Content-Type').headerExists('Content-Length').headerIs('Accept-Ranges', 'bytes')
      .headerLike('Content-Range', /^bytes 0-\d+\/\d+/).bodyLike(/^Hello World!/);

    (await client.getOk('/public/hello.txt', {headers: {Range: 'bytes'}})).statusIs(416);
    (await client.getOk('/public/hello.txt', {headers: {Range: 'bytes=4-1'}})).statusIs(416);
  });

  await t.test('Bundled files', async t => {
    (await client.getOk('/public/mojo/bootstrap/bootstrap.bundle.min.js')).statusIs(200)
      .headerIs('Content-Type', 'application/javascript').headerExists('Content-Length');
    (await client.getOk('/public/mojo/bootstrap/bootstrap.min.css')).statusIs(200).headerIs('Content-Type', 'text/css')
      .headerExists('Content-Length');

    (await client.getOk('/public/mojo/failraptor.png')).statusIs(200).headerIs('Content-Type', 'image/png')
      .headerExists('Content-Length');
    (await client.getOk('/public/mojo/favicon.ico')).statusIs(200).headerIs('Content-Type', 'image/x-icon')
      .headerExists('Content-Length');
    (await client.getOk('/public/mojo/logo-white-2x.png')).statusIs(200).headerIs('Content-Type', 'image/png')
      .headerExists('Content-Length');
    (await client.getOk('/public/mojo/logo-white.png')).statusIs(200).headerIs('Content-Type', 'image/png')
      .headerExists('Content-Length');
    (await client.getOk('/public/mojo/mojo.css')).statusIs(200).headerIs('Content-Type', 'text/css')
      .headerExists('Content-Length');
    (await client.getOk('/public/mojo/no-raptor.png')).statusIs(200).headerIs('Content-Type', 'image/png')
      .headerExists('Content-Length');
    (await client.getOk('/public/mojo/not-found.png')).statusIs(200).headerIs('Content-Type', 'image/png')
      .headerExists('Content-Length');
    (await client.getOk('/public/mojo/pinstripe-dark.png')).statusIs(200).headerIs('Content-Type', 'image/png')
      .headerExists('Content-Length');
    (await client.getOk('/public/mojo/pinstripe-light.png')).statusIs(200).headerIs('Content-Type', 'image/png')
      .headerExists('Content-Length');
  });

  await client.stop();
});
