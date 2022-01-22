import mojo from '../lib/core.js';
import t from 'tap';

t.test('Condition app', async t => {
  const app = mojo();

  if (app.mode === 'development') app.log.level = 'debug';

  app.router.addCondition('asyncParam', async (ctx, name) => {
    const params = await ctx.params();
    if (params.get(name) !== null) return true;
    return false;
  });

  app.get('/', ctx => ctx.render({text: 'Hello Mojo!'}));
  t.notSame(app.router.cache, null);

  app
    .get('/test')
    .requires('headers', {'X-Test': /pass/})
    .to(ctx => ctx.render({text: 'Header condition'}));
  t.same(app.router.cache, null);

  app
    .get('/test2')
    .requires('headers', {'X-Test': /pass/, 'X-Test2': /works/})
    .to(ctx => ctx.render({text: 'Header conditions'}));
  t.same(app.router.cache, null);

  app
    .get('/host')
    .requires('host', /mojojs\.org/)
    .to(ctx => ctx.render({text: 'Host condition'}));
  t.same(app.router.cache, null);

  app
    .get('/host')
    .requires('host', /mojolicious\.org/)
    .to(ctx => ctx.render({text: 'Other host condition'}));
  t.same(app.router.cache, null);

  app
    .any('/mixed')
    .get()
    .requires('host', /mojojs\.org/)
    .requires('headers', {'X-Test': /bender/i})
    .to(ctx => ctx.render({text: 'Mixed conditions'}));
  t.same(app.router.cache, null);

  app
    .any('/async')
    .requires('asyncParam', 'foo')
    .to(ctx => ctx.render({text: 'Async condition'}));
  t.same(app.router.cache, null);

  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Hello World', async () => {
    (await ua.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
  });

  await t.test('Simple header condition', async () => {
    (await ua.getOk('/test')).statusIs(404);
    (await ua.getOk('/test', {headers: {'X-Test': 'should pass'}})).statusIs(200).bodyIs('Header condition');
    (await ua.getOk('/test', {headers: {'X-Test': 'should fail'}})).statusIs(404);
  });

  await t.test('Multiple header conditions', async () => {
    (await ua.getOk('/test2')).statusIs(404);
    (await ua.getOk('/test2', {headers: {'X-Test': 'should pass', 'X-Test2': 'works too'}}))
      .statusIs(200)
      .bodyIs('Header conditions');
    (await ua.getOk('/test2', {headers: {'X-Test': 'should pass'}})).statusIs(404);
  });

  await t.test('Host conditions', async () => {
    (await ua.getOk('/host')).statusIs(404);
    (await ua.getOk('/host', {headers: {Host: 'mojojs.org'}})).statusIs(200).bodyIs('Host condition');

    (await ua.getOk('/host', {headers: {Host: 'minion.pm'}})).statusIs(404);
    (await ua.getOk('/host', {headers: {Host: 'mojolicious.org'}})).statusIs(200).bodyIs('Other host condition');
  });

  await t.test('Mixed conditions', async () => {
    (await ua.getOk('/mixed')).statusIs(404);
    (await ua.getOk('/mixed', {headers: {Host: 'mojojs.org', 'X-Test': 'Bender'}}))
      .statusIs(200)
      .bodyIs('Mixed conditions');
  });

  await t.test('Async condition', async () => {
    (await ua.getOk('/async')).statusIs(404);
    (await ua.getOk('/async?foo=bar')).statusIs(200).bodyIs('Async condition');
    (await ua.getOk('/async?bar=foo')).statusIs(404);
  });

  await ua.stop();
});
