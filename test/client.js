import t from 'tap';
import App from '../lib/app.js';
import Client from '../lib/client.js';
import Server from '../lib/server.js';
import {tempDir} from '../lib/file.js';

t.test('Client', async t => {
  const app = new App();

  app.get('/hello', ctx => ctx.render({text: 'Hello World!'}));

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

  app.get('/hello', {ext: 'json'}, ctx => ctx.render({json: {hello: 'world'}}));

  app.any('/methods', ctx => ctx.render({text: ctx.req.method}));

  app.any('/test.html', ctx => ctx.render({text: '<!DOCTYPE html><p>Hello JSDOM!</p>'}));

  const server = new Server(app, {listen: ['http://*'], quiet: true});
  await server.start();
  const client = new Client({baseURL: server.urls[0], name: 'mojo 1.0'});

  await t.test('Hello World', async t => {
    const res = await client.get('/hello');
    t.equal(res.status, 200);
    t.equal(res.statusMessage, 'OK');
    t.equal(await res.text(), 'Hello World!');
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
    const dir = await tempDir();
    const file = dir.child('hello.txt');
    await res.pipe(file.createWriteStream());
    t.equal(await file.readFile('utf8'), 'Hello Mojo!');

    const res2 = await client.put('/body', {body: file.createReadStream()});
    t.equal(res2.status, 200);
    t.equal(await res2.text(), 'Hello Mojo!');
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
