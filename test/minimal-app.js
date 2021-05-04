import t from 'tap';
import {app} from './support/minimal-app/myapp.js';

t.test('Minimal app', async t => {
  const client = await app.newTestClient({tap: t});

  await t.test('Home directory', async t => {
    t.ok(app.home, 'has home directory');
    t.ok(await app.home.exists(), 'home directory exists');
    t.ok(await app.home.child('myapp.js').exists(), 'home directory contains app');
  });

  await t.test('Hello World', async t => {
    (await client.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
  });

  await client.stop();
});
