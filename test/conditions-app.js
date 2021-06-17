import mojo from '../lib/mojo.js';
import t from 'tap';

t.test('Condition app', async t => {
  const app = mojo();

  if (app.mode === 'development') app.log.level = 'debug';

  app.get('/', ctx => ctx.render({text: 'Hello Mojo!'}));
  t.notSame(app.router.cache, null);

  app.get('/test').requires('headers', {'X-Test': /pass/}).to(ctx => ctx.render({text: 'Header condition'}));
  t.same(app.router.cache, null);

  app.get('/test2').requires('headers', {'X-Test': /pass/, 'X-Test2': /works/})
    .to(ctx => ctx.render({text: 'Header conditions'}));
  t.same(app.router.cache, null);

  app.get('/host').requires('host', /mojojs\.org/).to(ctx => ctx.render({text: 'Host condition'}));
  t.same(app.router.cache, null);

  app.get('/host').requires('host', /mojolicious\.org/).to(ctx => ctx.render({text: 'Other host condition'}));
  t.same(app.router.cache, null);

  app.any('/mixed').get().requires('host', /mojojs\.org/).requires('headers', {'X-Test': /bender/i})
    .to(ctx => ctx.render({text: 'Mixed conditions'}));
  t.same(app.router.cache, null);

  const client = await app.newTestClient({tap: t});

  await t.test('Hello World', async t => {
    (await client.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
  });

  await t.test('Simple header condition', async t => {
    (await client.getOk('/test')).statusIs(404);
    (await client.getOk('/test', {headers: {'X-Test': 'should pass'}})).statusIs(200).bodyIs('Header condition');
    (await client.getOk('/test', {headers: {'X-Test': 'should fail'}})).statusIs(404);
  });

  await t.test('Multiple header conditions', async t => {
    (await client.getOk('/test2')).statusIs(404);
    (await client.getOk('/test2', {headers: {'X-Test': 'should pass', 'X-Test2': 'works too'}})).statusIs(200)
      .bodyIs('Header conditions');
    (await client.getOk('/test2', {headers: {'X-Test': 'should pass'}})).statusIs(404);
  });

  await t.test('Host conditions', async t => {
    (await client.getOk('/host')).statusIs(404);
    (await client.getOk('/host', {headers: {Host: 'mojojs.org'}})).statusIs(200).bodyIs('Host condition');

    (await client.getOk('/host', {headers: {Host: 'minion.pm'}})).statusIs(404);
    (await client.getOk('/host', {headers: {Host: 'mojolicious.org'}})).statusIs(200).bodyIs('Other host condition');
  });

  await t.test('Mixed conditions', async t => {
    (await client.getOk('/mixed')).statusIs(404);
    (await client.getOk('/mixed', {headers: {Host: 'mojojs.org', 'X-Test': 'Bender'}})).statusIs(200)
      .bodyIs('Mixed conditions');
  });

  await client.stop();
});
