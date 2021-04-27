import t from 'tap';
import mojo from '../index.js';
import test from '../lib/client/test.js';

t.test('App', async t => {
  const app = mojo();

  app.get('/', ctx => ctx.render({text: 'Hello Mojo!'}));

  app.any('/methods', ctx => ctx.render({text: ctx.req.method}));

  const client = await test(app, {tap: t});

  await t.test('Hello World', async t => {
    (await client.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
    t.done();
  });

  await t.test('Methods', async t => {
    (await client.deleteOk('/methods')).statusIs(200).bodyIs('DELETE');
    (await client.getOk('/methods')).statusIs(200).bodyIs('GET');
    (await client.headOk('/methods')).statusIs(200).bodyIs('');
    (await client.optionsOk('/methods')).statusIs(200).bodyIs('OPTIONS');
    (await client.patchOk('/methods')).statusIs(200).bodyIs('PATCH');
    (await client.postOk('/methods')).statusIs(200).bodyIs('POST');
    (await client.putOk('/methods')).statusIs(200).bodyIs('PUT');
    t.done();
  });

  await client.done();
  t.done();
});
