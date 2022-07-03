import mojo, {Server} from '../lib/core.js';
import {captureOutput} from '@mojojs/util';
import t from 'tap';

t.test('Server', async t => {
  const app = mojo({mode: 'production'});

  app.get('/', ctx => ctx.render({text: 'Hello World!'}));

  app.get('/teapot', ctx => ctx.render({text: 'Teapot!', status: 418}));

  t.test('listenArgsforURL', t => {
    t.same(Server.listenArgsForURL(new URL('http://*')), [null, '0.0.0.0']);
    t.same(Server.listenArgsForURL(new URL('http://*:3000')), [3000, '0.0.0.0']);
    t.same(Server.listenArgsForURL(new URL('http://*:4000')), [4000, '0.0.0.0']);
    t.same(Server.listenArgsForURL(new URL('http://0.0.0.0:8000')), [8000, '0.0.0.0']);
    t.same(Server.listenArgsForURL(new URL('http://127.0.0.1:8080')), [8080, '127.0.0.1']);

    t.same(Server.listenArgsForURL(new URL('http://*?fd=3')), [{fd: 3}]);
    t.same(Server.listenArgsForURL(new URL('http://[::1]:5000')), [5000, '::1']);

    t.same(Server.listenArgsForURL(new URL(`http+unix:///var/run/myapp.sock`)), [{path: '/var/run/myapp.sock'}]);
    t.same(Server.listenArgsForURL(new URL(`http+unix://foo:23/myapp.sock`)), [{path: 'foo:23/myapp.sock'}]);
    t.same(Server.listenArgsForURL(new URL(`http+unix://myapp.sock`)), [{path: 'myapp.sock'}]);
    t.same(Server.listenArgsForURL(new URL(`http+unix://foo/bar.sock`)), [{path: 'foo/bar.sock'}]);

    t.end();
  });

  await t.test('Teapot', async t => {
    const ua = await app.newTestUserAgent({tap: t});

    (await ua.getOk('/teapot')).statusIs(418);
    t.equal(ua.res.statusMessage, "I'm a Teapot");

    await ua.stop();
  });

  await t.test('MOJO_SERVER_DEBUG', async t => {
    process.env.MOJO_SERVER_DEBUG = 1;
    const ua = await app.newTestUserAgent({tap: t});

    let res;
    const output = await captureOutput(
      async () => {
        res = await ua.get('/');
      },
      {stderr: true, stdout: false}
    );
    t.equal(res.statusCode, 200);
    t.equal(await res.text(), 'Hello World!');
    t.match(output, /Server <<< Client/);
    t.match(output, /GET \//);
    t.match(output, /Host: /);
    t.match(output, /Server >>> Client/);
    t.match(output, /Content-Length: /);
    t.match(output, /Hello World!/);

    await ua.stop();
  });
});
