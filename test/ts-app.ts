import mojo from '../lib/core.js';
import t from 'tap';

t.test('App', async t => {
  const app = mojo();

  app.log.level = 'fatal';

  // GET /
  app.get('/', ctx => ctx.render({text: 'Hello Mojo!'}));

  await using ua = await app.newTestUserAgent({tap: t});

  await t.test('Hello World', async () => {
    (await ua.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
  });
});
