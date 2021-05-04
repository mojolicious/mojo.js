import t from 'tap';
import {app} from './support/full-app/index.js';

t.test('Full app', async t => {
  const client = await app.newTestClient({tap: t});

  await t.test('Hello World', async t => {
    (await client.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
  });

  await t.test('Home directory', async t => {
    t.ok(app.home, 'has home directory');
    t.ok(await app.home.exists(), 'home directory exists');
    t.ok(await app.home.child('index.js').exists(), 'home directory contains app');
    t.ok(await app.home.child('..', 'full-app', 'index.js').exists(), 'correct parent directory');
  });

  await t.test('Controller', async t => {
    (await client.getOk('/foo')).statusIs(200).bodyIs('Action works!');
    (await client.getOk('/FOO')).statusIs(200).bodyIs('Action works!');
    (await client.getOk('/Foo')).statusIs(404);
    (await client.getOk('/fOO')).statusIs(404);
    (await client.putOk('/bar', {json: {controller: 'works'}})).statusIs(200).jsonIs({controller: 'works'});
    (await client.getOk('/bar')).statusIs(404);
    (await client.getOk('/bar/world')).statusIs(200).bodyIs('world');
    (await client.getOk('/bar/mojo')).statusIs(200).bodyIs('mojo');
    (await client.putOk('/bar/world')).statusIs(404);
    (await client.getOk('/foo/baz')).statusIs(200).bodyIs('Multiple levels');
    (await client.postOk('/foo/baz')).statusIs(404);
  });

  await t.test('View', async t => {
    (await client.getOk('/renderer/inline/foo')).statusIs(200).bodyIs('Hello foo');
    (await client.getOk('/renderer/inline/bar')).statusIs(200).bodyIs('Hello bar');

    (await client.getOk('/renderer/hello/foo')).statusIs(200).bodyLike(/Hey foo\r?\n/);
    (await client.getOk('/renderer/hello/bar')).statusIs(200).bodyLike(/Hey bar\r?\n/);

    (await client.putOk('/renderer/another.view')).statusIs(200).bodyLike(/User sri\r?\nis an admin\r?\n/);
  });

  await t.test('Static files', async t => {
    (await client.getOk('/public/test.txt')).statusIs(200).headerExists('Content-Length').bodyLike(/Static file\r?\n/);
    (await client.getOk('/public/does_not_exist.txt')).headerExistsNot('Etag').statusIs(404);
    (await client.getOk('/test.txt')).statusIs(404);
  });

  await client.stop();
});
