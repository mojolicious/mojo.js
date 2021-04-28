import t from 'tap';
import testClient from '../lib/client/test.js';

t.test('External app', async t => {
  const client = await testClient('./support/external-app/index.js', {tap: t});

  await t.test('Hello World', async t => {
    (await client.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
    t.done();
  });

  await client.done();
  t.done();
});
