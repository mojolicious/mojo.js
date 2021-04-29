import t from 'tap';
import mojo from '../index.js';

t.test('App', async t => {
  const app = mojo();

  app.config.appName = 'Test';
  app.models.test = {it: 'works'};

  // GET /
  app.get('/', ctx => ctx.render({text: 'Hello Mojo!'}));

  // * /methods
  app.any('/methods', ctx => ctx.render({text: ctx.req.method}));

  // PUT /json
  app.put('/json', async ctx => ctx.render({json: await ctx.req.json()}));

  // GET /nested
  // *   /nested/methods
  const nested = app.under('/nested').to(ctx => {
    if (ctx.req.url.searchParams.get('auth') === '1') return;
    ctx.render({text: 'Permission denied'});
    return false;
  });
  nested.get('/').to(ctx => ctx.render({text: 'Authenticated'}));
  const test = nested.any('/test').to({prefix: 'X:'});
  test.any('/methods').to(ctx => ctx.render({text: ctx.stash.prefix + ctx.req.method}));

  // * /pass/nested2
  const nested2 = app.under('/:auth').to(async ctx => {
    return new Promise(resolve => resolve(ctx.stash.auth === 'pass'));
  });
  nested2.any('/nested2').to(ctx => ctx.render({text: `Nested: ${ctx.stash.auth}`}));

  // * /exception/*
  app.any('/exception/:msg', ctx => {
    throw new Error(`Something went wrong: ${ctx.stash.msg}`);
  });

  // * /config
  app.any('/config').to(ctx => ctx.render({text: `${ctx.config.appName} ${ctx.models.test.it}`}));

  const client = await app.newTestClient({tap: t});

  await t.test('Hello World', async t => {
    (await client.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
    (await client.getOk('/')).statusIs(200).headerLike('Content-Length', /1/).bodyLike(/Mojo/);
  });

  await t.test('Methods', async t => {
    (await client.deleteOk('/methods')).statusIs(200).bodyIs('DELETE');
    (await client.getOk('/methods')).statusIs(200).bodyIs('GET');
    (await client.headOk('/methods')).statusIs(200).bodyIs('');
    (await client.optionsOk('/methods')).statusIs(200).bodyIs('OPTIONS');
    (await client.patchOk('/methods')).statusIs(200).bodyIs('PATCH');
    (await client.postOk('/methods')).statusIs(200).bodyIs('POST');
    (await client.putOk('/methods')).statusIs(200).bodyIs('PUT');
  });

  await t.test('JSON', async t => {
    (await client.putOk('/json', {json: {hello: 'world'}})).statusIs(200).jsonIs({hello: 'world'});
  });

  await t.test('Not found', async t => {
    (await client.putOk('/does_not_exist')).statusIs(404);
  });

  await t.test('Exception', async t => {
    (await client.getOk('/exception/works')).statusIs(500).bodyLike(/Exception: Error: Something went wrong: works/);
  });

  await t.test('Nested routes', async t => {
    (await client.getOk('/nested?auth=1')).statusIs(200).bodyIs('Authenticated');
    (await client.getOk('/nested?auth=0')).statusIs(200).bodyIs('Permission denied');
    (await client.getOk('/nested/test/methods?auth=1')).statusIs(200).bodyIs('X:GET');
    (await client.putOk('/nested/test/methods?auth=1')).statusIs(200).bodyIs('X:PUT');
    (await client.postOk('/nested/test/methods?auth=1')).statusIs(200).bodyIs('X:POST');
    (await client.getOk('/nested/test/methods?auth=0')).statusIs(200).bodyIs('Permission denied');
    (await client.getOk('/nested/test?auth=1')).statusIs(404);
    (await client.getOk('/nested/test/foo?auth=1')).statusIs(404);

    (await client.getOk('/pass/nested2')).statusIs(200).bodyIs('Nested: pass');
    (await client.patchOk('/pass/nested2')).statusIs(200).bodyIs('Nested: pass');
    (await client.getOk('/fail/nested2')).statusIs(404);
    (await client.getOk('/nested2')).statusIs(404);
  });

  await t.test('Config and models', async t => {
    (await client.getOk('/config')).statusIs(200).bodyIs('Test works');
  });

  await client.done();
});
