import t from 'tap';
import {tempdir} from '../lib/file.js';
import App from '../lib/app.js';
import Client from '../lib/client.js';
import Server from '../lib/server.js';

t.test('Client', async t => {
  const app = new App();

  app.get('/hello', ctx => ctx.render({text: 'Hello World!'}));

  app.get('/headers', ctx => {
    const name = ctx.req.url.searchParams.get('header');
    const value = ctx.req.headers[name] || 'fail';
    ctx.render({text: value});
  });

  app.put('/body', async ctx => {
    const body = await ctx.req.text();
    ctx.render({text: body});
  });

  app.get('/hello', {ext: 'json'}, ctx => ctx.render({json: {hello: 'world'}}));

  app.any('/methods', ctx => ctx.render({text: ctx.req.method}));

  const server = new Server(app, {listen: ['http://*'], quiet: true});
  await server.start();
  const client = new Client({baseURL: server.urls[0], name: 'mojo 1.0'});

  await t.test('Hello World', async t => {
    const res = await client.get('/hello');
    t.equal(res.status, 200, 'right status');
    t.equal(await res.text(), 'Hello World!', 'right content');
    t.done();
  });

  await t.test('Headers', async t => {
    const res = await client.get('/headers?header=user-agent');
    t.equal(res.status, 200, 'right status');
    t.equal(await res.text(), 'mojo 1.0', 'right content');

    const res2 = await client.get('/headers?header=test', {headers: {test: 'works'}});
    t.equal(res2.status, 200, 'right status');
    t.equal(await res2.text(), 'works', 'right content');
    t.done();
  });

  await t.test('Body', async t => {
    const res = await client.put('/body', {body: 'Body works!'});
    t.equal(res.status, 200, 'right status');
    t.equal(await res.text(), 'Body works!', 'right content');

    const res2 = await client.put('/body', {body: 'I ♥ Mojolicious!'});
    t.equal(res2.status, 200, 'right status');
    t.equal(await res2.text(), 'I ♥ Mojolicious!', 'right content');

    const res3 = await client.put('/body', {body: Buffer.from('I ♥ Mojolicious!')});
    t.equal(res3.status, 200, 'right status');
    t.equal((await res3.buffer()).toString(), 'I ♥ Mojolicious!', 'right content');
    t.done();
  });

  await t.test('JSON', async t => {
    const res = await client.get('/hello.json');
    t.equal(res.status, 200, 'right status');
    t.same(await res.json(), {hello: 'world'}, 'right content');
    t.done();
  });

  await t.test('Methods', async t => {
    const res = await client.delete('/methods');
    t.equal(res.status, 200, 'right status');
    t.equal(await res.text(), 'DELETE', 'right content');

    const res2 = await client.get('/methods');
    t.equal(res2.status, 200, 'right status');
    t.equal(await res2.text(), 'GET', 'right content');

    const res3 = await client.options('/methods');
    t.equal(res3.status, 200, 'right status');
    t.equal(await res3.text(), 'OPTIONS', 'right content');

    const res4 = await client.patch('/methods');
    t.equal(res4.status, 200, 'right status');
    t.equal(await res4.text(), 'PATCH', 'right content');

    const res5 = await client.post('/methods');
    t.equal(res5.status, 200, 'right status');
    t.equal(await res5.text(), 'POST', 'right content');

    const res6 = await client.put('/methods');
    t.equal(res6.status, 200, 'right status');
    t.equal(await res6.text(), 'PUT', 'right content');

    const res7 = await client.head('/hello');
    t.equal(res7.status, 200, 'right status');
    t.equal(res7.headers['content-length'], '12', 'right Content-Length value');
    t.equal(await res7.text(), '', 'right content');

    const res8 = await client.request({method: 'PUT', url: '/methods'});
    t.equal(res8.status, 200, 'right status');
    t.equal(await res8.text(), 'PUT', 'right content');
    t.done();
  });

  await t.test('Streams', async t => {
    const res = await client.put('/body', {body: 'Hello Mojo!'});
    t.equal(res.status, 200, 'right status');
    const dir = await tempdir();
    const file = dir.child('hello.txt');
    await res.pipe(file.createWriteStream());
    t.equal(await file.readFile('utf8'), 'Hello Mojo!', 'right content');

    const res2 = await client.put('/body', {body: file.createReadStream()});
    t.equal(res2.status, 200, 'right status');
    t.equal(await res2.text(), 'Hello Mojo!', 'right content');
    t.done();
  });

  await server.stop();
  t.done();
});
