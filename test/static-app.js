import {app} from './support/js/static-app/index.js';
import t from 'tap';

t.test('Static app', async t => {
  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Bundled files', async () => {
    (await ua.getOk('/static/mojo/bootstrap/bootstrap.bundle.min.js'))
      .statusIs(200)
      .typeIs('application/javascript')
      .headerExists('Content-Length');
    (await ua.getOk('/static/mojo/bootstrap/bootstrap.min.css'))
      .statusIs(200)
      .typeIs('text/css')
      .headerExists('Content-Length');

    (await ua.getOk('/static/mojo/highlight.js/highlight.pack.js'))
      .statusIs(200)
      .typeIs('application/javascript')
      .headerExists('Content-Length');
    (await ua.getOk('/static/mojo/highlight.js/highlight-mojo-dark.css'))
      .statusIs(200)
      .typeIs('text/css')
      .headerExists('Content-Length');

    (await ua.getOk('/static/mojo/failraptor.png')).statusIs(200).typeIs('image/png').headerExists('Content-Length');
    (await ua.getOk('/static/mojo/favicon.ico'))
      .statusIs(200)
      .typeIs('image/vnd.microsoft.icon')
      .headerExists('Content-Length');
    (await ua.getOk('/static/mojo/logo-white-2x.png')).statusIs(200).typeIs('image/png').headerExists('Content-Length');
    (await ua.getOk('/static/mojo/logo-white.png')).statusIs(200).typeIs('image/png').headerExists('Content-Length');
    (await ua.getOk('/static/mojo/mojo.css')).statusIs(200).typeIs('text/css').headerExists('Content-Length');
    (await ua.getOk('/static/mojo/no-raptor.png')).statusIs(200).typeIs('image/png').headerExists('Content-Length');
    (await ua.getOk('/static/mojo/not-found.png')).statusIs(200).typeIs('image/png').headerExists('Content-Length');
    (await ua.getOk('/static/mojo/pinstripe-dark.png'))
      .statusIs(200)
      .typeIs('image/png')
      .headerExists('Content-Length');
    (await ua.getOk('/static/mojo/pinstripe-light.png'))
      .statusIs(200)
      .typeIs('image/png')
      .headerExists('Content-Length');
  });

  await t.test('File names', t => {
    t.equal(app.static.filePath('/index.html'), '/static/index.html');
    t.equal(app.static.filePath('index.html'), '/static/index.html');
    t.end();
  });

  await t.test('0', async () => {
    (await ua.getOk('/static/0')).statusIs(200).headerIs('Content-Length', '1').bodyIs('0');
    (await ua.getOk('/0')).statusIs(200).headerIs('Content-Length', '4').bodyIs('Zero');
  });

  await t.test('Directories', async () => {
    (await ua.getOk('/static/test/one.txt')).statusIs(200).bodyLike(/works!/);

    (await ua.getOk('/static')).statusIs(404);
    (await ua.getOk('/static/')).statusIs(404);
    (await ua.getOk('/static/test')).statusIs(404);
    (await ua.getOk('/static/test/')).statusIs(404);
  });

  await t.test('Directory traversal', async () => {
    (await ua.getOk('/static/../../lib/mojo.js')).statusIs(404);
    (await ua.getOk('/static/..%2F..%2Flib/mojo.js')).statusIs(404);
    (await ua.getOk('/static/missing/..%2F..%2F..%2Flib/mojo.js')).statusIs(404);
    (await ua.getOk('/static/..%5C..%5Clib/mojo.js')).statusIs(404);
    (await ua.getOk('/static/missing/..%5C..%5C..%5Clib/mojo.js')).statusIs(404);
  });

  await t.test('Range', async () => {
    (await ua.getOk('/static/empty.txt'))
      .statusIs(200)
      .typeIs('text/plain; charset=utf-8')
      .headerIs('Content-Length', '0')
      .headerIs('Accept-Ranges', 'bytes')
      .bodyIs('');
    (await ua.getOk('/static/empty.txt', {headers: {Range: 'bytes=1-5'}})).statusIs(416).bodyIs('');

    (await ua.getOk('/static/hello.txt'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerIs('Accept-Ranges', 'bytes')
      .bodyLike(/^Hello World!/);

    (await ua.getOk('/static/hello.txt', {headers: {Range: 'bytes=1-5'}}))
      .statusIs(206)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerIs('Accept-Ranges', 'bytes')
      .headerLike('Content-Range', /^bytes 1-5\/\d+/)
      .bodyIs('ello ');
    (await ua.getOk('/static/hello.txt', {headers: {Range: 'bytes=-5'}}))
      .statusIs(206)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerIs('Accept-Ranges', 'bytes')
      .headerLike('Content-Range', /^bytes 0-5\/\d+/)
      .bodyIs('Hello ');
    (await ua.getOk('/static/hello.txt', {headers: {Range: 'bytes=1-'}}))
      .statusIs(206)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerIs('Accept-Ranges', 'bytes')
      .headerLike('Content-Range', /^bytes 1-\d+\/\d+/)
      .bodyLike(/^ello World!/);
    (await ua.getOk('/static/hello.txt', {headers: {Range: 'bytes=4-'}}))
      .statusIs(206)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerIs('Accept-Ranges', 'bytes')
      .headerLike('Content-Range', /^bytes 4-\d+\/\d+/)
      .bodyLike(/^o World!/);
    (await ua.getOk('/static/hello.txt', {headers: {Range: 'bytes=4-4'}}))
      .statusIs(206)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerIs('Accept-Ranges', 'bytes')
      .headerLike('Content-Range', /^bytes 4-4\/\d+/)
      .bodyIs('o');
    (await ua.getOk('/static/hello.txt', {headers: {Range: 'bytes=0-0'}}))
      .statusIs(206)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerIs('Accept-Ranges', 'bytes')
      .headerLike('Content-Range', /^bytes 0-\d+\/\d+/)
      .bodyIs('H');
    (await ua.getOk('/static/hello.txt', {headers: {Range: 'bytes=-'}}))
      .statusIs(206)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerIs('Accept-Ranges', 'bytes')
      .headerLike('Content-Range', /^bytes 0-\d+\/\d+/)
      .bodyLike(/^Hello World!/);

    (await ua.getOk('/static/hello.txt', {headers: {Range: 'bytes'}})).statusIs(416);
    (await ua.getOk('/static/hello.txt', {headers: {Range: 'bytes=4-1'}})).statusIs(416);
  });

  await t.test('Etag', async () => {
    (await ua.getOk('/static/hello.txt'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerExists('Accept-Ranges')
      .headerLike('Etag', /"[a-f0-9]+"/)
      .bodyLike(/Hello World!/);
  });

  await t.test('Last-Modified', async () => {
    (await ua.getOk('/static/hello.txt'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerExists('Accept-Ranges')
      .headerExists('Etag')
      .headerLike('Last-Modified', /\w+\W+(\d+)\W+(\w+)\W+(\d+)\W+(\d+):(\d+):(\d+)\W*\w+/)
      .bodyLike(/Hello World!/);
  });

  await t.test('If-None-Match', async () => {
    (await ua.getOk('/static/hello.txt'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerExists('Accept-Ranges')
      .headerLike('Etag', /"[a-f0-9]+"/)
      .bodyLike(/Hello World!/);
    const etag = ua.res.get('Etag');
    (await ua.getOk('/static/hello.txt', {headers: {'If-None-Match': etag}})).statusIs(304).bodyIs('');
    (await ua.getOk('/static/hello.txt', {headers: {'If-None-Match': `"whatever", ${etag}, "abcdef123345"`}}))
      .statusIs(304)
      .bodyIs('');

    (await ua.getOk('/static/hello.txt', {headers: {'If-None-Match': '"whatever", "abcdef123345"'}}))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerExists('Accept-Ranges')
      .headerExists('Etag')
      .headerExists('Last-Modified')
      .bodyLike(/Hello World!/);
  });

  await t.test('If-Modified-Since', async () => {
    (await ua.getOk('/static/hello.txt'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerExists('Accept-Ranges')
      .headerExists('Etag')
      .headerExists('Last-Modified')
      .bodyLike(/Hello World!/);

    const past = 'Sun, 06 Nov 1994 08:49:37 GMT';
    (await ua.getOk('/static/hello.txt', {headers: {'If-Modified-Since': past}}))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerExists('Accept-Ranges')
      .headerExists('Etag')
      .headerExists('Last-Modified')
      .bodyLike(/Hello World!/);

    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    (await ua.getOk('/static/hello.txt', {headers: {'If-Modified-Since': future.toUTCString()}}))
      .statusIs(304)
      .bodyIs('');

    (await ua.getOk('/static/hello.txt', {headers: {'If-Modified-Since': 'whatever'}}))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerExists('Accept-Ranges')
      .headerExists('Etag')
      .headerExists('Last-Modified')
      .bodyLike(/Hello World!/);
  });

  await t.test('Methods', async () => {
    (await ua.getOk('/static/hello.txt'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerExists('Accept-Ranges')
      .headerExists('Etag')
      .headerExists('Last-Modified')
      .headerExistsNot('Cache-Control')
      .bodyLike(/Hello World!/);

    (await ua.headOk('/static/hello.txt'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerExists('Accept-Ranges')
      .headerExists('Etag')
      .headerExists('Last-Modified')
      .headerExistsNot('Cache-Control')
      .bodyIs('');

    (await ua.postOk('/static/hello.txt'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerExistsNot('Accept-Ranges')
      .headerExistsNot('Etag')
      .headerExistsNot('Last-Modified')
      .headerExistsNot('Cache-Control')
      .bodyIs('Route: POST');

    (await ua.putOk('/static/hello.txt'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerExistsNot('Accept-Ranges')
      .headerExistsNot('Etag')
      .headerExistsNot('Last-Modified')
      .headerExistsNot('Cache-Control')
      .bodyIs('Route: PUT');
  });

  await t.test('Assets', async t => {
    const ctx = app.newMockContext();
    t.equal(ctx.urlForAsset('http://example.com'), 'http://example.com');
    t.equal(ctx.urlForAsset('unknown.css'), '/static/assets/unknown.css');
    t.equal(ctx.urlForAsset('foo.css'), '/static/assets/foo.ab1234cd5678ef.css');
    t.equal(ctx.urlForAsset('/foo.css'), '/static/assets/foo.ab1234cd5678ef.css');
    t.equal(ctx.urlForAsset('/foo.js'), '/static/assets/foo.ab1234cd5678ef.js');
    t.equal(ctx.urlForAsset('foo/bar/baz.js'), '/static/assets/foo/bar/baz.development.js');
    t.equal(ctx.urlForAsset('/foo/bar.js'), '/static/assets/foo/bar.321.js');
    t.equal(ctx.urlForAsset('/foo/bar/test.min.js'), '/static/assets/foo/bar/test.ab1234cd5678ef.min.js');
    t.equal(ctx.urlForAsset('/foo/bar/yada.css'), '/static/assets/foo/bar/yada.css');

    (await ua.getOk('/static/assets/unknown.css')).statusIs(404).headerExistsNot('Cache-Control');
    (await ua.getOk('/static/assets/foo.ab1234cd5678ef.css'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerIs('Cache-Control', 'no-cache')
      .bodyLike(/\* foo\.css asset/);
    (await ua.getOk('/static/assets/foo.ab1234cd5678ef.js'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerIs('Cache-Control', 'no-cache')
      .bodyLike(/\* foo\.js asset/);
    (await ua.getOk('/static/assets/foo/bar.321.js'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerIs('Cache-Control', 'no-cache')
      .bodyLike(/\* foo\/bar\.js asset/);
    (await ua.getOk('/static/assets/foo/bar/baz.development.js'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerIs('Cache-Control', 'no-cache')
      .bodyLike(/\* foo\/bar\/baz\.js development asset/);
    (await ua.getOk('/static/assets/foo/bar/baz.123.js'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerIs('Cache-Control', 'no-cache')
      .bodyLike(/\* foo\/bar\/baz\.js asset/);
    (await ua.getOk('/static/assets/foo/bar/test.ab1234cd5678ef.min.js'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerIs('Cache-Control', 'no-cache')
      .bodyLike(/\* foo\/bar\/test\.min\.js asset/);
    (await ua.getOk('/static/assets/foo/bar/yada.css'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerIs('Cache-Control', 'no-cache')
      .bodyLike(/\* foo\/bar\/yada\.css asset/);

    app.mode = 'production';
    (await ua.getOk('/static/assets/foo.ab1234cd5678ef.css'))
      .statusIs(200)
      .headerExists('Content-Type')
      .headerExists('Content-Length')
      .headerExistsNot('Cache-Control')
      .bodyLike(/\* foo\.css asset/);
  });

  await ua.stop();
});
