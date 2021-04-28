import t from 'tap';
import {app} from './support/external-app/index.js';

t.test('External app', async t => {
  const client = await app.newTestClient({tap: t});

  await t.test('Hello World', async t => {
    (await client.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
  });

  await client.done();
});
