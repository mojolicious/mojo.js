'use strict';

const mojo = require('../lib/mojo');
const t = require('tap');

t.test('Server', async t => {
  const app = mojo();

  app.get('/', ctx => ctx.render({text: 'Hello World!'}));

  t.test('listenArgsforURL', t => {
    t.same(mojo.Server.listenArgsForURL(new URL('http://*')), [null, '0.0.0.0']);
    t.same(mojo.Server.listenArgsForURL(new URL('http://*:3000')), [3000, '0.0.0.0']);
    t.same(mojo.Server.listenArgsForURL(new URL('http://*:4000')), [4000, '0.0.0.0']);
    t.same(mojo.Server.listenArgsForURL(new URL('http://0.0.0.0:8000')), [8000, '0.0.0.0']);
    t.same(mojo.Server.listenArgsForURL(new URL('http://127.0.0.1:8080')), [8080, '127.0.0.1']);

    t.same(mojo.Server.listenArgsForURL(new URL('http://*?fd=3')), [{fd: 3}]);
    t.same(mojo.Server.listenArgsForURL(new URL('http://[::1]:5000')), [5000, '::1']);

    t.end();
  });

  await t.test('MOJO_SERVER_DEBUG', async t => {
    process.env.MOJO_SERVER_DEBUG = 1;
    const client = await app.newTestClient({tap: t});

    let res;
    const output = await mojo.util.captureOutput({stderr: true, stdout: false}, async () => {
      res = await client.get('/');
    });
    t.equal(res.status, 200);
    t.equal(await res.text(), 'Hello World!');
    t.match(output, /Server <<< Client/);
    t.match(output, /GET \//);
    t.match(output, /Host: /);
    t.match(output, /Server >>> Client/);
    t.match(output, /Content-Length: /);
    t.match(output, /Hello World!/);

    await client.stop();
  });
});
