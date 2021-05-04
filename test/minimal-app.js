import t from 'tap';
import {app} from './support/minimal-app/myapp.js';

t.test('Minimal app', async t => {
  const client = await app.newTestClient({tap: t});

  await t.test('Moniker', async t => {
    t.equal(app.moniker, 'myapp');
    t.end();
  });

  await t.test('Hello World', async t => {
    (await client.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
  });

  await client.stop();
});
