import Client from '../lib/client.js';
import File from '../lib/file.js';
import http from 'http';
import mojo from '../lib/mojo.js';
import Server from '../lib/server.js';
import t from 'tap';

t.test('Client', async t => {
  const app = mojo();

  app.get('/hello', ctx => ctx.render({text: 'Hello World!'}));

  app.get('/status', ctx => {
    ctx.render({text: '', status: parseInt(ctx.req.query.get('status'))});
  });

  app.get('/headers', ctx => {
    const name = ctx.req.query.get('header');
    const value = ctx.req.get(name) || 'fail';
    ctx.res.set('X-Test', 'works too');
    ctx.render({text: value});
  });

  app.put('/body', async ctx => {
    const body = await ctx.req.text();
    ctx.render({text: body});
  });

  app.post('/form', async ctx => {
    const form = await ctx.req.form();
    const foo = form.get('foo') ?? 'missing';
    const bar = form.get('bar') ?? 'missing';
    ctx.render({text: `Form: ${foo}, ${bar}`});
  });

  app.get('/hello', {ext: 'json'}, ctx => ctx.render({json: {hello: 'world'}}));

  app.any('/methods', ctx => ctx.render({text: ctx.req.method}));

  app.any('/test.html', ctx => ctx.render({text: '<!DOCTYPE html><p>Hello JSDOM!</p>'}));

  app.get('/auth/basic', async ctx => {
    const auth = ctx.req.userinfo ?? 'nothing';
    const body = (await ctx.req.text()) || 'nothing';
    ctx.render({text: `basic: ${auth}, body: ${body}`});
  });

  const server = new Server(app, {listen: ['http://*'], quiet: true});
  await server.start();
  const client = new Client({baseURL: server.urls[0], name: 'mojo 1.0'});

  await t.test('Hello World', async t => {
    const res = await client.get('/hello');
    t.equal(res.status, 200);
    t.equal(res.statusMessage, 'OK');
    t.equal(await res.text(), 'Hello World!');
  });

  await t.test('Status', async t => {
    const res = await client.get('/status?status=200');
    t.ok(res.isSuccess);
    t.not(res.isError);
    t.not(res.isClientError);
    t.not(res.isServerError);
    t.not(res.isRedirect);
    t.equal(res.status, 200);
    t.equal(await res.text(), '');

    const res2 = await client.get('/status?status=201');
    t.ok(res2.isSuccess);
    t.not(res2.isError);
    t.not(res2.isClientError);
    t.not(res2.isServerError);
    t.not(res2.isRedirect);
    t.equal(res2.status, 201);
    t.equal(await res2.text(), '');

    const res3 = await client.get('/status?status=302');
    t.not(res3.isSuccess);
    t.not(res3.isError);
    t.not(res3.isClientError);
    t.not(res3.isServerError);
    t.ok(res3.isRedirect);
    t.equal(res3.status, 302);
    t.equal(await res3.text(), '');

    const res4 = await client.get('/status?status=404');
    t.not(res4.isSuccess);
    t.ok(res4.isError);
    t.ok(res4.isClientError);
    t.not(res4.isServerError);
    t.not(res4.isRedirect);
    t.equal(res4.status, 404);
    t.equal(await res4.text(), '');

    const res5 = await client.get('/status?status=500');
    t.not(res5.isSuccess);
    t.ok(res5.isError);
    t.not(res5.isClientError);
    t.ok(res5.isServerError);
    t.not(res5.isRedirect);
    t.equal(res5.status, 500);
    t.equal(await res5.text(), '');

    const res6 = await client.get('/status?status=599');
    t.not(res6.isSuccess);
    t.ok(res6.isError);
    t.not(res6.isClientError);
    t.ok(res6.isServerError);
    t.not(res6.isRedirect);
    t.equal(res6.status, 599);
    t.equal(await res6.text(), '');

    const res7 = await client.get('/status?status=299');
    t.ok(res7.isSuccess);
    t.not(res7.isError);
    t.not(res7.isClientError);
    t.not(res7.isServerError);
    t.not(res7.isRedirect);
    t.equal(res7.status, 299);
    t.equal(await res7.text(), '');
  });

  await t.test('Headers', async t => {
    const res = await client.get('/headers?header=user-agent');
    t.equal(res.status, 200);
    t.equal(res.get('X-Test'), 'works too');
    t.equal(await res.text(), 'mojo 1.0');

    const res2 = await client.get('/headers?header=test', {headers: {test: 'works'}});
    t.equal(res2.status, 200);
    t.equal(res2.get('X-Test'), 'works too');
    t.equal(await res2.text(), 'works');
  });

  await t.test('Body', async t => {
    const res = await client.put('/body', {body: 'Body works!'});
    t.equal(res.status, 200);
    t.equal(await res.text(), 'Body works!');

    const res2 = await client.put('/body', {body: 'I ♥ Mojolicious!'});
    t.equal(res2.status, 200);
    t.equal(await res2.text(), 'I ♥ Mojolicious!');

    const res3 = await client.put('/body', {body: Buffer.from('I ♥ Mojolicious!')});
    t.equal(res3.status, 200);
    t.equal((await res3.buffer()).toString(), 'I ♥ Mojolicious!');
  });

  await t.test('JSON', async t => {
    const res = await client.get('/hello.json');
    t.equal(res.status, 200);
    t.same(await res.json(), {hello: 'world'});
  });

  await t.test('Form', async t => {
    const res = await client.post('/form', {form: {foo: 'works'}});
    t.equal(res.status, 200);
    t.equal(await res.text(), 'Form: works, missing');

    const res2 = await client.post('/form', {form: {foo: 'works', bar: 'too'}});
    t.equal(res2.status, 200);
    t.equal(await res2.text(), 'Form: works, too');

    const res3 = await client.post('/form', {json: {foo: 'works', bar: 'too'}});
    t.equal(res3.status, 200);
    t.equal(await res3.text(), 'Form: missing, missing');

    const res4 = await client.post('/form', {form: {foo: 'w(o-&2F%2F)r k  s', bar: '%&!@#$%^&*&&%'}});
    t.equal(res4.status, 200);
    t.equal(await res4.text(), 'Form: w(o-&2F%2F)r k  s, %&!@#$%^&*&&%');
  });

  await t.test('Methods', async t => {
    const res = await client.delete('/methods');
    t.equal(res.status, 200);
    t.equal(await res.text(), 'DELETE');

    const res2 = await client.get('/methods');
    t.equal(res2.status, 200);
    t.equal(await res2.text(), 'GET');

    const res3 = await client.options('/methods');
    t.equal(res3.status, 200);
    t.equal(await res3.text(), 'OPTIONS');

    const res4 = await client.patch('/methods');
    t.equal(res4.status, 200);
    t.equal(await res4.text(), 'PATCH');

    const res5 = await client.post('/methods');
    t.equal(res5.status, 200);
    t.equal(await res5.text(), 'POST');

    const res6 = await client.put('/methods');
    t.equal(res6.status, 200);
    t.equal(await res6.text(), 'PUT');

    const res7 = await client.head('/hello');
    t.equal(res7.status, 200);
    t.equal(res7.get('Content-Length'), '12');
    t.equal(await res7.text(), '');

    const res8 = await client.request({method: 'PUT', url: '/methods'});
    t.equal(res8.status, 200);
    t.equal(await res8.text(), 'PUT');
  });

  await t.test('Streams', async t => {
    const res = await client.put('/body', {body: 'Hello Mojo!'});
    t.equal(res.status, 200);
    const dir = await File.tempDir();
    const file = await dir.child('hello.txt').touch();
    await res.pipe(file.createWriteStream());
    t.equal(await file.readFile('utf8'), 'Hello Mojo!');

    const res2 = await client.put('/body', {body: file.createReadStream()});
    t.equal(res2.status, 200);
    t.equal(await res2.text(), 'Hello Mojo!');
  });

  await t.test('Basic authentication', async t => {
    const res = await client.get('/auth/basic', {auth: 'foo:bar'});
    t.equal(res.status, 200);
    t.equal(await res.text(), 'basic: foo:bar, body: nothing');

    const res2 = await client.get('/auth/basic');
    t.equal(res2.status, 200);
    t.equal(await res2.text(), 'basic: nothing, body: nothing');

    const res3 = await client.get('/auth/basic', {auth: 'foo:bar:baz', body: 'test'});
    t.equal(res3.status, 200);
    t.equal(await res3.text(), 'basic: foo:bar:baz, body: test');
  });

  await t.test('Custom agent', async t => {
    const keepAlive = new http.Agent({keepAlive: true});
    const noKeepAlive = new http.Agent({keepAlive: false});

    const res = await client.get('/hello', {agent: noKeepAlive});
    t.equal(res.status, 200);
    t.equal(res.get('Connection'), 'close');
    t.equal(await res.text(), 'Hello World!');

    const res2 = await client.get('/hello', {agent: keepAlive});
    t.equal(res2.status, 200);
    t.equal(res2.get('Connection'), 'keep-alive');
    t.equal(await res2.text(), 'Hello World!');
    keepAlive.destroy();
  });

  await t.test('Optional dependencies', async t => {
    let skipJSDOM = false;
    try {
      await import('jsdom');
    } catch {
      skipJSDOM = true;
    }

    await t.test('JSDOM', {skip: skipJSDOM}, async t => {
      const res = await client.get('/test.html');
      const dom = await res.dom();
      t.equal(dom.window.document.querySelector('p').textContent, 'Hello JSDOM!');
    });
  });

  await server.stop();
});
