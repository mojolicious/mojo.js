import net from 'node:net';
import {Readable} from 'node:stream';
import {gzipSync} from 'node:zlib';
import mojo, {mountPlugin, util} from '../src/core.ts';
import t from 'tap';

t.test('Limits app', async t => {
  const app = mojo({mode: 'production'});

  app.log.level = 'fatal';
  t.equal(app.maxRequestSize, 16 * 1024 * 1024);
  app.maxRequestSize = 10;

  app.post('/json', async ctx => ctx.render({json: await ctx.req.json()}));

  app.post('/text', async ctx => ctx.render({text: await ctx.req.text()}));

  app.post('/form', async ctx => ctx.render({json: (await ctx.req.form()).toObject()}));

  app.post('/large', async ctx => {
    ctx.req.maxMessageSize = 100;
    await ctx.render({text: await ctx.req.text()});
  });

  app.post('/txt', async ctx => {
    ctx.exceptionFormat = 'txt';
    await ctx.render({text: await ctx.req.text()});
  });

  app.post('/json-error', async ctx => {
    ctx.exceptionFormat = 'json';
    await ctx.render({text: await ctx.req.text()});
  });

  app.get('/teapot', () => {
    throw new util.HTTPError(418);
  });

  app.get('/upstream', () => {
    throw Object.assign(new Error('Upstream not found'), {status: 404});
  });

  const embedded = mojo();
  embedded.post('/text', async ctx => ctx.render({text: await ctx.req.text()}));
  app.plugin(mountPlugin, {app: embedded, path: '/embedded'});

  app.websocket('/echo').to(ctx => {
    ctx.on('connection', ws => {
      ws.on('message', message => ws.send(message));
    });
  });

  const ua = await app.newTestUserAgent({tap: t}, {maxWebSocketSize: 10});

  await t.test('Within limit', async () => {
    (await ua.postOk('/json', {json: {a: 1}})).statusIs(200).jsonIs({a: 1});
    (await ua.postOk('/text', {body: '1234567890'})).statusIs(200).bodyIs('1234567890');
  });

  await t.test('Content-Length exceeds limit', async () => {
    (await ua.postOk('/json', {json: {hello: 'world'}})).statusIs(413);
    (await ua.postOk('/text', {body: '12345678901'})).statusIs(413);
  });

  await t.test('Chunked body exceeds limit', async () => {
    (await ua.postOk('/text', {body: Readable.from(['12345', '67890', '1'])})).statusIs(413);
    (await ua.postOk('/text', {body: Readable.from(['12345', '67890'])})).statusIs(200).bodyIs('1234567890');
  });

  await t.test('Decompressed body exceeds limit', async t => {
    // Small on the wire, but too large after decompression
    const body = gzipSync('a'.repeat(1000));
    t.ok(body.length <= 100);
    (await ua.postOk('/large', {body, headers: {'Content-Encoding': 'gzip'}})).statusIs(413);
    (await ua.postOk('/large', {body: gzipSync('hello'), headers: {'Content-Encoding': 'gzip'}}))
      .statusIs(200)
      .bodyIs('hello');
  });

  await t.test('Form exceeds limit', async () => {
    (await ua.postOk('/form', {form: {a: 'b'}})).statusIs(200).jsonIs({a: 'b'});
    (await ua.postOk('/form', {form: {a: 'bcdefghijk'}})).statusIs(413);
    (await ua.postOk('/form', {formData: {a: 'b'}})).statusIs(413);
  });

  await t.test('Limit for one request', async () => {
    (await ua.postOk('/large', {body: 'a'.repeat(100)})).statusIs(200).bodyIs('a'.repeat(100));
    (await ua.postOk('/large', {body: 'a'.repeat(101)})).statusIs(413);
  });

  await t.test('Exception formats', async () => {
    (await ua.postOk('/txt', {body: '12345678901'})).statusIs(413).bodyIs('Request Entity Too Large');
    (await ua.postOk('/json-error', {body: '12345678901'}))
      .statusIs(413)
      .jsonIs({error: {message: 'Request Entity Too Large'}});
  });

  await t.test('Connection gets closed for bodies that are too large', async t => {
    const {port} = ua.server.urls[0];
    const response = await new Promise(resolve => {
      let data = '';
      const socket = net.connect(port, '127.0.0.1', () => {
        socket.write('POST /text HTTP/1.1\r\nHost: localhost\r\nContent-Length: 10737418240\r\n\r\nHello');
      });
      socket.on('data', chunk => (data += chunk)).on('close', () => resolve(data));
    });
    t.match(response, /^HTTP\/1\.1 413 /);
    t.match(response, /Connection: close/i);
  });

  await t.test('Mounted application uses the limit of the outer one', async () => {
    t.equal(embedded.maxRequestSize, 16 * 1024 * 1024);
    (await ua.postOk('/embedded/text', {body: '1234567890'})).statusIs(200).bodyIs('1234567890');
    (await ua.postOk('/embedded/text', {body: '12345678901'})).statusIs(413);
  });

  await t.test('HTTPError', async () => {
    (await ua.getOk('/teapot')).statusIs(418);
    (await ua.getOk('/upstream')).statusIs(500);
  });

  await t.test('WebSocket message exceeds limit', async () => {
    await ua.websocketOk('/echo');
    await ua.sendOk('1234567890');
    t.equal(await ua.messageOk(), '1234567890');
    await ua.sendOk('12345678901');
    await ua.closedOk(1009);
  });

  await ua.stop();
});
