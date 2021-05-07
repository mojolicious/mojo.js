import mojo from '../index.js';
import t from 'tap';

t.test('App', async t => {
  const app = mojo();

  app.log.level = 'fatal';

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
    if (ctx.req.query.get('auth') === '1') return;
    ctx.render({text: 'Permission denied'});
    return false;
  });
  nested.get('/').to(ctx => ctx.render({text: 'Authenticated'}));
  const test = nested.any('/test').to({prefix: 'X:'});
  test.any('/methods').to(ctx => ctx.render({text: ctx.stash.prefix + ctx.req.method}));

  // * /exception/*
  app.any('/exception/:msg', ctx => {
    throw new Error(`Something went wrong: ${ctx.stash.msg}`);
  }).name('exception');

  // * /config
  app.any('/config').to(ctx => ctx.render({text: `${ctx.config.appName} ${ctx.models.test.it}`}));

  // * /request_id
  app.any('/request_id').to(ctx => ctx.render({text: ctx.req.requestId}));

  // DELETE /
  app.delete('/', ctx => ctx.render({text: 'Delete'}));

  // PATCH /
  app.patch('/', ctx => ctx.render({text: 'Patch'}));

  // OPTIONS /
  app.options('/', ctx => ctx.render({text: 'Options'}));

  // POST /
  app.post('/', ctx => ctx.render({text: 'Post'}));

  // GET /custom/request_id
  const custom = app.under(ctx => (ctx.req.requestId = '123'));
  custom.get('/custom/request_id').to(ctx => ctx.render({text: ctx.req.requestId}));

  // GET /cookie
  app.get('/cookie', ctx => {
    const foo = ctx.req.getCookie('foo') ?? 'not present';
    if (foo === 'not present') ctx.res.setCookie('foo', 'present');
    ctx.render({text: `Cookie: ${foo}`});
  });

  // GET /client
  app.get('/client', async ctx => {
    const res = await ctx.client.get(client.server.urls[0] + 'config');
    ctx.render({text: await res.text()});
  });

  // GET /url_for
  app.any('/url_for/:msg', async ctx => {
    const form = await ctx.req.form();
    const target = form.get('target');
    let values;
    if (form.has('msg')) values = {msg: form.get('msg')};
    ctx.render({text: ctx.urlFor(target, values)});
  }).to({msg: 'fail'});
  app.any('/websocket').websocket('/route').any('/works').name('websocket_route');

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

    (await client.deleteOk('/')).statusIs(200).bodyIs('Delete');
    (await client.patchOk('/')).statusIs(200).bodyIs('Patch');
    (await client.optionsOk('/')).statusIs(200).bodyIs('Options');
    (await client.postOk('/')).statusIs(200).bodyIs('Post');
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
  });

  await t.test('Config and models', async t => {
    (await client.getOk('/config')).statusIs(200).bodyIs('Test works');
  });

  await t.test('Request ID', async t => {
    (await client.getOk('/request_id')).statusIs(200).bodyLike(/^[0-9]+-[0-9a-z]{6}$/);
    (await client.getOk('/custom/request_id')).statusIs(200).bodyIs('123');
  });

  await t.test('Cookie', async t => {
    (await client.getOk('/cookie')).statusIs(200).bodyIs('Cookie: not present');
    (await client.getOk('/cookie')).statusIs(200).bodyIs('Cookie: present');
    (await client.getOk('/cookie')).statusIs(200).bodyIs('Cookie: present');
  });

  await t.test('Client', async t => {
    (await client.getOk('/client')).statusIs(200).bodyIs('Test works');
  });

  await t.test('urlFor', async t => {
    const baseURL = client.server.urls[0];
    (await client.postOk('/url_for', {form: {target: '/foo'}})).statusIs(200).bodyIs(`${baseURL}foo`);
    (await client.postOk('/url_for', {form: {target: '/foo/bar.txt'}})).statusIs(200).bodyIs(`${baseURL}foo/bar.txt`);
    (await client.postOk('/url_for', {form: {target: 'current'}})).statusIs(200).bodyIs(`${baseURL}url_for`);
    (await client.postOk('/url_for', {form: {target: 'current', msg: 'test'}})).statusIs(200)
      .bodyIs(`${baseURL}url_for/test`);
    (await client.postOk('/url_for', {form: {target: 'websocket_route'}})).statusIs(200)
      .bodyIs(`${baseURL}websocket/route/works`.replace(/^http/, 'ws'));
    (await client.postOk('/url_for', {form: {target: 'exception', msg: 'test'}})).statusIs(200)
      .bodyIs(`${baseURL}exception/test`);
  });

  await client.stop();
});
