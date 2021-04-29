import t from 'tap';
import {app} from './support/external-app/index.js';

t.test('External app', async t => {
  const client = await app.newTestClient({tap: t});

  await t.test('Hello World', async t => {
    (await client.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
  });

  await t.test('Home directory', async t => {
    t.ok(app.home, 'has home directory');
    t.ok(await app.home.exists(), 'home directory exists');
    t.ok(await app.home.child('index.js').exists(), 'home directory contains app');
    t.ok(await app.home.child('..', 'external-app', 'index.js').exists(), 'correct parent directory');
  });

  await t.test('Controller', async t => {
    (await client.getOk('/foo')).statusIs(200).bodyIs('Action works!');
  });

  await client.done();
});
