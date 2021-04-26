import t from 'tap';
import {tempdir} from '../lib/util.js';
import App from '../lib/app.js';
import Client from '../lib/client.js';
import Server from '../lib/server.js';

t.test('Client', async t => {
  const app = new App();

  app.get('/hello', ctx => ctx.render({text: 'Hello Mojo!'}));

  app.get('/headers', ctx => {
    const name = ctx.req.url.searchParams.get('header');
    const value = ctx.req.headers[name] || 'fail';
    ctx.render({text: value});
  });

  app.put('/body', async ctx => {
    const body = await ctx.req.text();
    ctx.render({text: body});
  });

  const server = new Server(app, {listen: ['http://*'], quiet: true});
  await server.start();
  const client = new Client({baseURL: server.urls[0], name: 'mojo 1.0'});

  await t.test('Hello World', async t => {
    const res = await client.get('/hello');
    t.equal(res.status, 200, 'right status');
    t.equal(await res.text(), 'Hello Mojo!', 'right content');
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
    t.done();
  });

  await t.test('Stream', async t => {
    const res = await client.get('/hello');
    t.equal(res.status, 200, 'right status');
    const dir = await tempdir();
    const file = dir.child('hello.txt');
    await res.pipe(file.createWriteStream());
    t.equal(await file.readFile('utf8'), 'Hello Mojo!', 'right content');
    t.done();
  });

  await server.stop();
  t.done();
});
