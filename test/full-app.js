import {app} from './support/js/full-app/index.js';
import t from 'tap';

t.test('Full app', async t => {
  const ua = await app.newTestUserAgent({tap: t});

  t.equal(app.log.level, 'debug');

  await t.test('Hello World', async () => {
    (await ua.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
  });

  await t.test('Environment', async t => {
    t.equal(app.config.name, 'Full');
    t.equal(app.log.level, 'debug');
  });

  await t.test('Home directory', async t => {
    t.ok(app.home);
    t.ok(await app.home.exists());
    t.ok(await app.home.child('index.js').exists());
    t.ok(await app.home.child('..', 'full-app', 'index.js').exists());
  });

  await t.test('Controller', async () => {
    (await ua.getOk('/foo')).statusIs(200).bodyIs('Action works!');
    (await ua.getOk('/FOO')).statusIs(200).bodyIs('Action works!');
    (await ua.getOk('/Foo')).statusIs(404);
    (await ua.getOk('/fOO')).statusIs(404);
    (await ua.putOk('/bar', {json: {controller: 'works'}})).statusIs(200).jsonIs({controller: 'works'});
    (await ua.getOk('/bar')).statusIs(404);
    (await ua.getOk('/bar/world')).statusIs(200).bodyIs('world');
    (await ua.getOk('/bar/mojo')).statusIs(200).bodyIs('mojo');
    (await ua.putOk('/bar/world')).statusIs(404);
    (await ua.getOk('/foo/baz')).statusIs(200).bodyIs('Multiple levels');
    (await ua.getOk('/not/found'))
      .typeIs('text/plain; charset=utf-8')
      .headerIs('X-Not', 'found')
      .statusIs(404)
      .bodyIs('Not Found');
    (await ua.postOk('/foo/baz')).statusIs(404);

    (await ua.getOk('/url?target=/foo')).statusIs(200).bodyIs('/foo');
    (await ua.getOk('/url?target=websocket_echo')).statusIs(200).bodyLike(/ws:.+\d+\/echo.json/);
  });

  await t.test('View', async () => {
    (await ua.getOk('/renderer/inline/foo')).statusIs(200).bodyIs('Hello foo');
    (await ua.getOk('/renderer/inline/bar')).statusIs(200).bodyIs('Hello bar');

    (await ua.getOk('/renderer/hello/foo'))
      .statusIs(200)
      .bodyUnlike(/<style>/)
      .bodyLike(/Hey foo\r?\n/);
    (await ua.getOk('/renderer/hello/bar'))
      .statusIs(200)
      .bodyUnlike(/<style>/)
      .bodyLike(/Hey bar\r?\n/);
    (await ua.getOk('/renderer/hello/layout/bar'))
      .statusIs(200)
      .bodyLike(/<style>/)
      .bodyLike(/Hey bar\r?\n/);

    (await ua.putOk('/renderer/another.view')).statusIs(200).bodyLike(/User sri\r?\nis an admin<br>\r?\n/);

    (await ua.getOk('/default/view')).statusIs(200).bodyLike(/Header.*Default for foo and defaultView.*Footer/s);
  });

  await t.test('View (variants)', async () => {
    (await ua.getOk('/variants')).statusIs(200).bodyIs('Variant: Desktop!\n\n');
    (await ua.getOk('/variants?device=tablet')).statusIs(200).bodyIs('Variant: Tablet!\n\n');
    (await ua.getOk('/variants?device=phone')).statusIs(200).bodyIs('Variant: Desktop!\n\n');
    (await ua.getOk('/variants?device=0')).statusIs(200).bodyIs('Another variant: Desktop!\n\n');
  });

  await t.test('Static files', async () => {
    (await ua.getOk('/static/test.txt'))
      .statusIs(200)
      .headerExists('Content-Length')
      .bodyLike(/Static file\r?\n/);
    (await ua.getOk('/static'))
      .statusIs(200)
      .headerExists('Content-Length')
      .bodyLike(/Static file\r?\n/);
    (await ua.getOk('/static/does_not_exist.txt')).headerExistsNot('Etag').statusIs(404);
    (await ua.getOk('/test.txt')).statusIs(404);
  });

  await t.test('Session', async () => {
    (await ua.getOk('/session/login/kraih')).statusIs(200).bodyIs('Login: kraih');
    (await ua.getOk('/session/logout')).statusIs(200).bodyIs('Logout: kraih');
  });

  await t.test('WebSocket', async t => {
    await ua.websocketOk('/echo.json', {json: true});
    await ua.sendOk({hello: 'world'});
    t.same(await ua.messageOk(), {hello: 'world!'});
    await ua.sendOk({hello: 'mojo'});
    t.same(await ua.messageOk(), {hello: 'mojo!'});
    await ua.closeOk(1000);
    await ua.closedOk(1000);
  });

  await ua.stop();

  await t.test('Hooks', async () => {
    const ua = await app.newTestUserAgent({tap: t});
    (await ua.getOk('/hooks'))
      .statusIs(200)
      .jsonIs(['app:start: Full', 'app:warmup: Full', 'app:stop: Full', 'app:start: Full', 'app:warmup: Full']);
    await ua.stop();
  });
});
