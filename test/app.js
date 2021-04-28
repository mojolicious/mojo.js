import t from 'tap';
import mojo from '../index.js';

t.test('App', async t => {
  const app = mojo();

  app.get('/', ctx => ctx.render({text: 'Hello Mojo!'}));

  app.any('/methods', ctx => ctx.render({text: ctx.req.method}));

  app.put('/json', async ctx => {
    const data = await ctx.req.json();
    ctx.render({json: data});
  });

  const client = await app.newTestClient({tap: t});

  await t.test('Hello World', async t => {
    (await client.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
    (await client.getOk('/')).statusIs(200).headerLike('Content-Length', /1/).bodyLike(/Mojo/);
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

  await t.test('JSON', async t => {
    (await client.putOk('/json', {json: {hello: 'world'}})).statusIs(200).jsonIs({hello: 'world'});
    t.done();
  });

  await client.done();
  t.done();
});
