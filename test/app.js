import t from 'tap';
import mojo from '../index.js';
import test from '../lib/client/test.js';

t.test('App', async t => {
  const app = mojo();

  app.get('/', ctx => ctx.render({text: 'Hello Mojo!'}));

  app.post('/hello', ctx => ctx.render({text: 'Hello World!'}));

  const client = await test(app, {tap: t});

  await t.test('Hello World', async t => {
    (await client.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
    (await client.postOk('/hello')).statusIs(200).headerIs('Content-Length', '12').bodyIs('Hello World!');
    t.done();
  });

  await client.done();
  t.done();
});
