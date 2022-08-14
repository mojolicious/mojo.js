import {app} from './support/js/mount-app/embedded.js';
import t from 'tap';

t.test('Mount app', async t => {
  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Home directory', async t => {
    t.ok(app.home);
    t.ok(await app.home.exists());
    t.ok(await app.home.child('embedded.js').exists());
  });

  await t.test('Hello World', async () => {
    (await ua.getOk('/')).statusIs(200).bodyIs('Hello MountApp!');
  });

  await t.test('Full app', async () => {
    (await ua.getOk('/mount/full')).statusIs(200).bodyIs('Hello Mojo!');
    (await ua.getOk('/mount/full/foo')).statusIs(200).bodyIs('Action works!');
    (await ua.getOk('/mount/full/foo/baz')).statusIs(200).bodyIs('Multiple levels');
    (await ua.getOk('mount/full/variants?device=tablet')).statusIs(200).bodyIs('Variant: Tablet!\n\n');
    (await ua.getOk('mount/full/not/found'))
      .typeIs('text/plain; charset=utf-8')
      .headerIs('X-Not', 'found')
      .statusIs(404)
      .bodyIs('Not Found');

    (await ua.getOk('mount/full/static/test.txt'))
      .statusIs(200)
      .headerExists('Content-Length')
      .bodyLike(/Static file\r?\n/);
    (await ua.getOk('/mount/full/does/not/exist')).statusIs(404);

    (await ua.getOk('/mount/full/url?target=/foo')).statusIs(200).bodyIs('/mount/full/foo');
    (await ua.getOk('/mount/full/url?target=websocket_echo'))
      .statusIs(200)
      .bodyLike(/ws:.+\d+\/mount\/full\/echo.json/);
  });

  await t.test('Full app (mounted again)', async () => {
    (await ua.getOk('/mount/full-two')).statusIs(200).bodyIs('Hello Mojo!');
    (await ua.getOk('mount/full-two/variants?device=tablet')).statusIs(200).bodyIs('Variant: Tablet!\n\n');
    (await ua.getOk('mount/full-two/not/found'))
      .typeIs('text/plain; charset=utf-8')
      .headerIs('X-Not', 'found')
      .statusIs(404)
      .bodyIs('Not Found');
    (await ua.getOk('mount/full-two/static/test.txt'))
      .statusIs(200)
      .headerExists('Content-Length')
      .bodyLike(/Static file\r?\n/);
    (await ua.getOk('/mount/full/does/not/exist')).statusIs(404);

    (await ua.getOk('/mount/full-two/url?target=/foo')).statusIs(200).bodyIs('/mount/full-two/foo');
    (await ua.getOk('/mount/full-two/url?target=websocket_echo'))
      .statusIs(200)
      .bodyLike(/ws:.+\d+\/mount\/full-two\/echo.json/);
  });

  await t.test('Full app (host)', async () => {
    (await ua.getOk('/')).statusIs(200).bodyIs('Hello MountApp!');
    (await ua.getOk('/', {headers: {Host: 'test1.example.com'}})).statusIs(200).bodyIs('Hello Mojo!');
    (await ua.getOk('/mount/full-three', {headers: {Host: 'test1.example.com'}})).statusIs(404);
    (await ua.getOk('/mount/full-three', {headers: {Host: 'test2.example.com'}})).statusIs(200).bodyIs('Hello Mojo!');

    (await ua.getOk('/url?target=/foo', {headers: {Host: 'test1.example.com'}})).statusIs(200).bodyIs('/foo');
    (await ua.getOk('/url?target=websocket_echo', {headers: {Host: 'test1.example.com'}}))
      .statusIs(200)
      .bodyLike(/ws:\/\/test1\.example\.com\/echo.json/);
    (await ua.getOk('/mount/full-three/url?target=/foo', {headers: {Host: 'test2.example.com'}}))
      .statusIs(200)
      .bodyIs('/mount/full-three/foo');
    (await ua.getOk('/mount/full-three/url?target=websocket_echo', {headers: {Host: 'test2.example.com'}}))
      .statusIs(200)
      .bodyLike(/ws:\/\/test2\.example\.com\/mount\/full-three\/echo.json/);
    (await ua.getOk('/mount/full-three/url?target=websocket_echo', {headers: {Host: 'some-test2.example.com'}}))
      .statusIs(200)
      .bodyLike(/ws:\/\/some-test2\.example\.com\/mount\/full-three\/echo.json/);
  });

  await t.test('Full app (extended)', async t => {
    (await ua.getOk('/mount/full/extended')).statusIs(200).bodyIs('sharing works!');

    let called = false;
    app.addContextHook('send:before', () => {
      called = true;
    });
    const logs = app.log.capture();
    (await ua.getOk('/mount/full/fails'))
      .typeIs('text/plain; charset=utf-8')
      .statusIs(500)
      .bodyLike(/Error: Intentional error/);
    logs.stop();
    t.match(logs.toString(), /\[error\].+Intentional error/);
    t.same(called, true);
  });

  await t.test('Full app (reset paths)', async t => {
    let outerContext;
    app.addContextHook('dispatch:before', async ctx => {
      outerContext = ctx;
    });
    (await ua.getOk('/mount/full/FOO')).statusIs(200).bodyIs('Action works!');
    t.equal(outerContext.req.basePath, '');
    t.equal(outerContext.req.path, '/mount/full/FOO');
  });

  await t.test('Full app (shared session)', async () => {
    (await ua.getOk('/session/members')).statusIs(200).bodyIs('Member: not logged in');
    (await ua.getOk('/mount/full/session/login/kraih')).statusIs(200).bodyIs('Login: kraih');
    (await ua.getOk('/session/members')).statusIs(200).bodyIs('Member: kraih');
    (await ua.getOk('/mount/full/session/logout')).statusIs(200).bodyIs('Logout: kraih');
  });

  await t.test('Full app (WebSocket)', async () => {
    await ua.websocketOk('/mount/full/echo.json', {json: true});
    await ua.sendOk({hello: 'world'});
    t.same(await ua.messageOk(), {hello: 'world!'});
    await ua.sendOk({hello: 'mojo'});
    t.same(await ua.messageOk(), {hello: 'mojo!'});
    await ua.closeOk(1000);
    await ua.closedOk(1000);
  });

  await t.test('Config app', async () => {
    (await ua.getOk('/config')).statusIs(200).bodyIs('My name is Bond. James Bond.');
    (await ua.getOk('/config/foo')).statusIs(404);
  });

  await ua.stop();

  await t.test('Full app (hooks)', async () => {
    const ua = await app.newTestUserAgent({tap: t});
    (await ua.getOk('/mount/full/hooks'))
      .statusIs(200)
      .jsonIs([
        'app:start: Full',
        'app:warmup: Full',
        'app:warmup: Full',
        'app:warmup: Full',
        'app:warmup: Full',
        'app:stop: Full',
        'app:start: Full',
        'app:warmup: Full',
        'app:warmup: Full',
        'app:warmup: Full',
        'app:warmup: Full'
      ]);
    await ua.stop();
  });
});
